import { withPluginApi } from "discourse/lib/plugin-api";
import Composer from "discourse/models/composer";
import Draft from "discourse/models/draft";
import User from "discourse/models/user";
import Group from "discourse/models/group";
import { next } from "@ember/runloop";
function initializeTestPlugin(api) {
	api.modifyClass('controller:composer', {
		destroyDraft() {
			var returnedData = this._super();
			if(this.get("model.projectidc")){
				this.set("model.projectidc",undefined);	
				this.set("model.metadatac",undefined);	
			}
			return returnedData;
		}
	});
	api.modifyClass('route:new-topic', {
		_sendTransition(event, transition, categoryId) {
			Ember.run.next(() => {
				event.send(
						"createNewTopicViaParams",
						transition.to.queryParams.title,
						transition.to.queryParams.body,
						categoryId,
						transition.to.queryParams.tags,
						transition.to.queryParams.projectid,
						transition.to.queryParams.metadata

				);
			});
		}
	});
	api.modifyClass('route:new-message', {
		beforeModel(transition) {
			const params = transition.to.queryParams;
			const groupName = params.groupname || params.group_name;
			if (this.currentUser) {
				this.replaceWith("userPrivateMessages", this.currentUser).then(e => {
					if (params.username) {
						User.findByUsername(encodeURIComponent(params.username))
						.then(user => {
							if (user.can_send_private_message_to_user) {
								next(() =>
								e.send(
										"createNewMessageViaParams",
										user.username,
										params.title,
										params.body,
										params.projectid,
										params.metadata
								)
								);
							} else {
								bootbox.alert(
										I18n.t("composer.cant_send_pm", { username: user.username })
								);
							}
						})
						.catch(() => bootbox.alert(I18n.t("generic_error")));
					} else if (groupName) {
						Group.messageable(groupName)
						.then(result => {
							if (result.messageable) {
								next(() =>
								e.send(
										"createNewMessageViaParams",
										groupName,
										params.title,
										params.body,
										params.projectid,
										params.metadata
								)
								);
							} else {
								bootbox.alert(
										I18n.t("composer.cant_send_pm", { username: groupName })
								);
							}
						})
						.catch(() => bootbox.alert(I18n.t("generic_error")));
					} else {
						e.send("createNewMessageViaParams", null, params.title, params.body,params.projectid,params.metadata);
					}
				});
			} else {
				$.cookie("destination_url", window.location.href);
				this.replaceWith("login");
			}
		}
	});
}
export default {
	name: "topic-metadata.js",
	initialize() {
		Composer.serializeOnCreate('projectidc', 'projectidc');
		Composer.serializeOnCreate('metadatac', 'metadatac');

		withPluginApi("0.1", initializeTestPlugin);
	}
};
