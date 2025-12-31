const settingKeys = [
    'removeTracking',
    'removeTime',
    'removePlaylist',
    'removeLC',
    'convertShorts',
    'copyMarkdown'
];

// 1. 저장된 설정 불러오기 및 다국어 처리
document.addEventListener('DOMContentLoaded', () => {
    // 다국어 처리
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const message = chrome.i18n.getMessage(key);
        if (message) {
            element.textContent = message;
        }
    });

    chrome.storage.sync.get(settingKeys, (items) => {
        // 기본값 설정 (undefined일 경우의 처리)
        document.getElementById('removeTracking').checked = items.removeTracking !== false;
        document.getElementById('removeTime').checked = items.removeTime === true;
        document.getElementById('removePlaylist').checked = items.removePlaylist === true;
        document.getElementById('removeLC').checked = items.removeLC === true;
        document.getElementById('convertShorts').checked = items.convertShorts === true;
        document.getElementById('copyMarkdown').checked = items.copyMarkdown === true;
    });
});

// 2. 변경 감지 및 저장
settingKeys.forEach(key => {
    document.getElementById(key).addEventListener('change', (e) => {
        const setting = {};
        setting[key] = e.target.checked;

        chrome.storage.sync.set(setting);

        // 열려있는 탭에 즉시 반영
        chrome.tabs.query({ url: "*://www.youtube.com/*" }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action: "updateSettings", setting: setting });
            });
        });
    });
});