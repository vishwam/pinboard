var cachedSettings = null;

function getSettings() {
	return cachedSettings;
}

function setSettings(settings) {
	cachedSettings = settings;
}

function getAllMenuItems() {
	return {
		allBookmarks : "All Bookmarks",
		privateBookmarks : "Private Bookmarks", 
		publicBookmarks : "Public Bookmarks", 
		unreadBookmarks : "Unread Bookmarks", 
		untaggedBookmarks : "Untagged Bookmarks", 
		starredBookmarks : "Starred Bookmarks", 
		networkBookmarks : "Network Bookmarks", 
		recentBookmarks : "Recent Bookmarks", 
		popularBookmarks : "Popular Bookmarks", 
		saveBookmark : "Save Bookmark", 
		readLater : "Read Later", 
		addNote : "Add Note"
	};
}

function getUserNameFromApiToken(apiToken) {
	return apiToken ? apiToken.substring(0, apiToken.indexOf(":")) : "";
}

function openUrl(url) {	
	if ("yes" == getSettings().alwaysOpenNewTabs) {
		chrome.tabs.create({url: url});
	} else {
		chrome.tabs.getAllInWindow(null, function (tabs) {
			for (var i in tabs) {
				var tab = tabs[i];
				if (tab.url == url) {
					chrome.tabs.update(tab.id, {url:url, selected:true});
					return;
				}
			}
			chrome.tabs.create({url: url});
		});
	}
}

function showOptions() {
	chrome.tabs.create({url: chrome.extension.getURL("options.html")});
}

function allBookmarks() {
	openUrl("https://pinboard.in/u:" + getUserNameFromApiToken(getSettings().apiToken) + "/");
}

function privateBookmarks() {
	openUrl("https://pinboard.in/u:" + getUserNameFromApiToken(getSettings().apiToken) + "/private/");
}

function publicBookmarks() {
	openUrl("https://pinboard.in/u:" + getUserNameFromApiToken(getSettings().apiToken) + "/public/");
}

function unreadBookmarks() {
	openUrl("https://pinboard.in/u:" + getUserNameFromApiToken(getSettings().apiToken) + "/unread/");
}

function untaggedBookmarks() {
	openUrl("https://pinboard.in/u:" + getUserNameFromApiToken(getSettings().apiToken) + "/untagged/");
}

function starredBookmarks() {
	openUrl("https://pinboard.in/u:" + getUserNameFromApiToken(getSettings().apiToken) + "/starred/");
}

function networkBookmarks() {
	openUrl("https://pinboard.in/network/");
}

function recentBookmarks() {
	openUrl("https://pinboard.in/recent/");
}

function popularBookmarks() {
	openUrl("https://pinboard.in/popular/");
}

function saveBookmark() {
	chrome.tabs.executeScript({file: "save_bookmark.js"});
}

function addPost(url, title, description, isPublic, isReadLater, /* private: */ _tags) {
	var settings = getSettings();
	var tags = _tags || [];
	
	// check if tags should be automatically fetched:
	if (!_tags && settings.autoFillTags === "yes") {
		$.ajax({
			data: {
				auth_token: settings.apiToken,
				url: url,
				format: "json"
			},
			contentType: "text/plain",
			crossDomain: true,
			dataType: "json",
			timeout: 10 * 1000,
			type: "GET",
			url: "https://api.pinboard.in/v1/posts/suggest"
		}).done(function(data) {
			for (var i in data) {
				var map = data[i].popular || data[i].recommended;
				for (var j in map) {
					tags.push(map[j]);
				}
			}
		}).always(function() {
			// recurse with tags present:
			addPost(url, title, description, isPublic, isReadLater, tags);
		});
		
		return;
	}
	
	// truncate tags if above pinboard limits:
	if (tags.length > 100) {
		tags.length = 100;
	}
	
	var request = $.ajax({
		data: {
			auth_token: settings.apiToken,
			url: url,
			description: title.substr(0, 256),
			extended: description.substr(0, 65536),
			tags: tags.join(','),
			shared: isPublic,
			toread: isReadLater,
			format: "json"
		},
		contentType: "text/plain",
		crossDomain: true,
		dataType: "json",
		timeout: 10 * 1000,
		type: "GET",
		url: "https://api.pinboard.in/v1/posts/add"
	});
	
	if (settings.showDesktopNotifications === "yes") {
		request.done(function(data) {
			if (data.result_code === "done") {
				var notification = new Notification("Saved Read Later", { icon: "icon_48.png" });
				notification.onshow = function() { setTimeout(function(){ notification.cancel(); }, 5000); };
				notification.onclick = function() { notification.cancel(); };
				notification.show();
			}
			else {
				var notification = new Notification("Error Saving Read Later", { icon: "icon_48.png", body: "Error: " + data.result_code });
				notification.onshow = function() { setTimeout(function(){ notification.cancel(); }, 5000); };
				notification.onclick = function() { notification.cancel(); };
				notification.show();
			}
		}).fail(function(jqxhr) {
			var notification = new Notification("Error Saving Read Later", { icon: "icon_48.png", body: jqxhr.status + " " + jqxhr.statusText + ": " + jqxhr.responseText });
			notification.onshow = function() { setTimeout(function(){ notification.cancel(); }, 5000); };
			notification.onclick = function() { notification.cancel(); };
			notification.show();
		});
	}
} // end addPost();

function readLater() {
	chrome.tabs.getSelected(null , function(tab) {
		addPost(tab.url, tab.title, '', "no", "yes");
	});
}

function addNote() {
	openUrl("https://pinboard.in/note/add/");
}

document.addEventListener("DOMContentLoaded", function () {
	chrome.commands.onCommand.addListener(function(command) {
		if ("save-bookmark" == command) {
			saveBookmark();
		}
		else if ("read-later" == command) {
			readLater();
		}
	});
	
	setSettings(getSettingsFromLocalStorage());
	
	chrome.browserAction.setIcon({ path: "icon_19_dark.png" });
});


