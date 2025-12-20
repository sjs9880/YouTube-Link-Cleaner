// 설정 객체 (기본값)
let config = {
    removeTracking: true,
    removeTime: false,
    removePlaylist: false,
    convertShorts: false,
    copyMarkdown: false
};

// 초기화 및 설정 로드
chrome.storage.sync.get(Object.keys(config), (items) => {
    config = { ...config, ...items };
    runCleaner();
    cleanAddressBar(); // [핵심] 페이지 로드 시 주소창 즉시 청소
});

// 설정 변경 수신
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "updateSettings") {
        config = { ...config, ...request.setting };
        runCleaner();
    }
});

// === URL 정제 및 변환 함수 ===
function getCleanUrl(urlStr) {
    try {
        const url = new URL(urlStr);
        let changed = false;

        // 1. Shorts -> 일반 영상 변환
        if (config.convertShorts && url.pathname.includes('/shorts/')) {
            const videoId = url.pathname.split('/shorts/')[1];
            if (videoId) {
                url.pathname = '/watch';
                url.searchParams.set('v', videoId);
                changed = true;
            }
        }

        // 2. 태그 제거 로직
        if (config.removeTracking) {
            ['si', 'feature', 'pp', 'gclid'].forEach(p => {
                if (url.searchParams.has(p)) { url.searchParams.delete(p); changed = true; }
            });
        }
        if (config.removeTime && url.searchParams.has('t')) {
            url.searchParams.delete('t'); changed = true;
        }
        if (config.removePlaylist && url.searchParams.has('list')) {
            url.searchParams.delete('list'); url.searchParams.delete('index'); changed = true;
        }

        return changed ? url.toString() : null;
    } catch (e) { return null; }
}

// === [추가된 기능] 주소창(Address Bar) 자동 청소 ===
function cleanAddressBar() {
    const currentUrl = window.location.href;
    const cleanUrl = getCleanUrl(currentUrl);

    if (cleanUrl) {
        // 기록을 남기지 않고 주소창만 조용히 바꿈
        window.history.replaceState(null, '', cleanUrl);
    }
}

// === DOM 링크 청소 ===
function runCleaner() {
    const links = document.querySelectorAll('a[href*="/watch"], a[href*="youtu.be"]');
    links.forEach(link => {
        const clean = getCleanUrl(link.href);
        if (clean) link.href = clean;
    });

    const shareInput = document.querySelector('input#share-url');
    if (shareInput && shareInput.value) {
        const cleanShare = getCleanUrl(shareInput.value);
        if (cleanShare) shareInput.value = cleanShare;
    }
}

// === 복사 이벤트 가로채기 ===
document.addEventListener('copy', (e) => {
    const selection = document.getSelection().toString();
    let targetUrl = null;

    if (selection.includes('youtube.com') || selection.includes('youtu.be')) {
        targetUrl = selection;
    } else if (window.location.href.includes('watch') || window.location.href.includes('shorts')) {
        targetUrl = window.location.href;
    }

    if (!targetUrl) return;

    let cleanUrl = getCleanUrl(targetUrl) || targetUrl;

    if (config.copyMarkdown) {
        const titleElement = document.querySelector('h1.ytd-watch-metadata');
        const title = titleElement ? titleElement.innerText.trim() : document.title.replace(' - YouTube', '');
        const markdownText = `[${title}](${cleanUrl})`;
        e.preventDefault();
        e.clipboardData.setData('text/plain', markdownText);
    } else {
        const originalClean = getCleanUrl(targetUrl);
        if (originalClean) {
            e.preventDefault();
            e.clipboardData.setData('text/plain', originalClean);
        }
    }
});

// 감시자 실행
const observer = new MutationObserver(runCleaner);
observer.observe(document.body, { childList: true, subtree: true });

// 유튜브 페이지 이동 감지 (추가됨)
document.addEventListener('yt-navigate-finish', () => {
    cleanAddressBar();
    runCleaner();
});