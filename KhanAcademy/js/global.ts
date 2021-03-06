﻿module KA {
    'use strict';

    var service: Global, loggedIn: boolean, displayText, loginButton;

    export class Global {
        // property to track if the app is running for the first time for current version. 
        // this is used for cleaning/upgrading data from old versions and showing user what's new in the new version
        public IsFirstRun: boolean;

        constructor() {
            var localSettings = Windows.Storage.ApplicationData.current.localSettings,
                version = Windows.ApplicationModel.Package.current.id.version;

            var appVersion = version.major + "." + version.minor + "." + version.build + "." + version.revision;

            var lastAppVersion = localSettings.values[Constants.SETTINGS_APP_VERSION];

            this.IsFirstRun = !lastAppVersion || lastAppVersion != appVersion;

            // set the version if it's first run. this value will be persisted and for next run, app would know it's not first run
            if (this.IsFirstRun) {
                localSettings.values[Constants.SETTINGS_APP_VERSION] = appVersion;
            }
        }

        handleNetworkStatusChanged(e) {
            if (e.statusChange) {
                service.showNetworkStatus();

                // If user is signed in and connectivity just got restored, refresh user data
                if (KA.Data.getIsConnected() && User.AuthToken && User.AuthToken.key && !User.UserInfo) {
                    User.Refresh();
                }
            }
        }

        handleUserInfoRequested() {
            KA.show(KA.id('userProgress'));
            loginButton.disabled = true;
        }

        handleUserInfoUpdated(e) {
            var avatarImage = KA.id("avatarImage"),
                userImage = KA.id("userImage"),
                userName = KA.id("userName"),
                userPoints = KA.id("userPoints"),
                joined = KA.id("joined");

            if (e.userInfo) {
                loggedIn = true;

                userName.innerHTML = displayText.innerHTML = e.userInfo.nickName;
                avatarImage.style.backgroundImage = userImage.style.backgroundImage = "url('" + e.userInfo.avatarUrl + "')";
                joined.innerHTML = "Joined " + moment(e.userInfo.joined).fromNow();

                if (e.userInfo.points > 0) {
                    var decimalFormat = new Windows.Globalization.NumberFormatting.DecimalFormatter();
                    decimalFormat.isGrouped = true;
                    decimalFormat.fractionDigits = 0;
                    userPoints.innerHTML = decimalFormat.format(e.userInfo.points) + ' <span>points</span>';
                } else {
                    userPoints.innerHTML = '0 <span>points</span>';
                }


            } else {
                loggedIn = false;

                userName.innerHTML = displayText.innerHTML = "Log In";
                avatarImage.style.backgroundImage = userImage.style.backgroundImage = "url('/images/leaf-green.png')";
                joined.innerHTML = "";
                userPoints.innerHTML = '0 <span>points</span>';
            }
            KA.hide(KA.id('userProgress'));
            loginButton.disabled = false;
        }

        static init() {
            service = new KA.Global();

            // start WinJS logging as there is other code which might fail and try to log errors
            WinJS.Utilities.startLog({ type: "error", tags: "Khan Academy" });

            return new WinJS.Promise(function (c, e) {
                //init user log in menu
                service.initUserMenu();

                //init download Directory
                Windows.Storage.StorageFolder.getFolderFromPathAsync(Windows.Storage.ApplicationData.current.localSettings.values['savedir']).done(function (folder) {
                    if (folder) {
                        KA.Settings.downloadDirectory = folder;
                    }
                    else {
                        console.log("Download Directory Initialization Error - No Folder");
                    }
                });

                //init services
                KA.ApiClient.init().then(function () {
                    //run init on services in parallel to speed up startup
                    return WinJS.Promise.join([
                        KA.Data.init(service.IsFirstRun),
                        KA.User.init(),
                        KA.Downloads.init()]);
                }).done(function () {
                        //init settings flyout
                        WinJS.Application.onsettings = function (e) {
                            e.detail.applicationcommands = {
                                "terms": { title: "Terms of Service", href: "/pages/flyouts/terms.html" },
                                "privacy": { title: "Privacy Policy", href: "/pages/flyouts/privacy.html" },
                                "about": { title: "About", href: "/pages/flyouts/about.html" },
                                "feedback": { title: "Feedback", href: "/pages/flyouts/feedback.html" }
                            };
                            WinJS.UI.SettingsFlyout.populateSettings(e);
                        };

                        //init logging
                        WinJS.Promise.onerror = KA.handleError;
                        WinJS.Application.onerror = KA.handleError;
                        window.onerror = function (err) {
                            KA.handleError(err);
                        };
                        c();
                    });
            });
        }

        static showNetworkStatus() {
            service.showNetworkStatus();
        }

        initUserMenu() {
            var userMenu;

            displayText = KA.id('displayText');
            userMenu = KA.id('userMenu').winControl;
            loginButton = KA.id("loginButton");

            userMenu.anchor = KA.id("userAvatarContainer");
            loginButton.addEventListener('click', function (e) {
                if (loggedIn) {
                    userMenu.show();
                } else {
                    KA.User.logIn();
                }
            });

            KA.id("logoutMenuItem").addEventListener("click", KA.User.logOut);

            WinJS.Application.addEventListener("userInfoUpdated", service.handleUserInfoUpdated);
            WinJS.Application.addEventListener("userInfoRequested", service.handleUserInfoRequested);
            WinJS.Application.addEventListener("networkStatusChanged", service.handleNetworkStatusChanged);
        }

        showNetworkStatus() {
            if (KA.Data.getIsConnected()) {
                KA.hide(KA.id('noConnectionPane'));
            } else {
                KA.show(KA.id('noConnectionPane'));
            }
        }
    }
}