module KA {
    'use strict';

    export class Settings {
        static isInDesigner = Windows.ApplicationModel.DesignMode.designModeEnabled;
        static newDataCheckDelay = 3;
        static downloadPath: String = Windows.Storage.ApplicationData.current.localSettings.values['savedir'];
        static downloadDirectory: Windows.Storage.StorageFolder; 
    }
}