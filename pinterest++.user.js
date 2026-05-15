// ==UserScript==
// @name         Pinterest++
// @name:en      Pinterest++
// @name:zh-CN   Pinterest++
// @namespace    https://github.com/zker67/pinterest-plus-plus
// @description  为 Pinterest 增加原图下载与保存状态按钮。
// @description:zh-CN 为 Pinterest 增加原图下载与保存状态按钮。
// @description:en Add compact buttons for original image download and save state.
// @match        https://*.pinterest.com/*
// @match        https://*.pinterest.at/*
// @match        https://*.pinterest.ca/*
// @match        https://*.pinterest.ch/*
// @match        https://*.pinterest.cl/*
// @match        https://*.pinterest.co.kr/*
// @match        https://*.pinterest.co.uk/*
// @match        https://*.pinterest.com.au/*
// @match        https://*.pinterest.com.mx/*
// @match        https://*.pinterest.de/*
// @match        https://*.pinterest.dk/*
// @match        https://*.pinterest.es/*
// @match        https://*.pinterest.fr/*
// @match        https://*.pinterest.ie/*
// @match        https://*.pinterest.info/*
// @match        https://*.pinterest.it/*
// @match        https://*.pinterest.jp/*
// @match        https://*.pinterest.nz/*
// @match        https://*.pinterest.ph/*
// @match        https://*.pinterest.pt/*
// @match        https://*.pinterest.se/*
// @author       zker67, TiLied
// @version      0.8.25
// @license      MIT
// @grant        GM_download
// @grant        GM.download
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_setClipboard
// @grant        GM.setClipboard
// @connect      i.pinimg.com
// @connect      *.pinimg.com
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/zker67/pinterest-plus-plus/main/pinterest++.user.js
// @updateURL    https://raw.githubusercontent.com/zker67/pinterest-plus-plus/main/pinterest++.user.js
// ==/UserScript==

class PinterestPlus {
	_Observer = null;
	_PinCache = new Map();
	_MediaSelector = "img, video, video source, [style*='pinimg.com']";

	constructor() {
		console.log("Pinterest Plus v" + GM.info.script.version + " initialization");
		this._SetCSS();
		this._StartDownloadObserver();
	}

	_SetCSS() {
		const css = `
			.ppCardOverlayHost {
				position: relative !important;
			}

			.ppNativeSaveHidden {
				height: 1px !important;
				opacity: 0 !important;
				overflow: hidden !important;
				pointer-events: none !important;
				position: absolute !important;
				width: 1px !important;
			}

			.ppCompactActionBar {
				align-items: center;
				display: inline-flex;
				gap: 8px;
				opacity: 0;
				pointer-events: auto !important;
				position: absolute;
				right: 12px;
				top: 12px;
				transform: translateY(-2px);
				transition: opacity 160ms ease, transform 160ms ease;
				z-index: 1003;
			}

			.ppCardOverlayHost:hover > .ppCompactActionBar,
			.ppCardOverlayHost:focus-within > .ppCompactActionBar {
				opacity: 1;
				transform: translateY(0);
			}

			.ppIconButton {
				align-items: center;
				backdrop-filter: blur(10px);
				background: #fff;
				border: 0;
				border-radius: 999px;
				box-shadow: 0 1px 4px rgba(0, 0, 0, 0.16);
				box-sizing: border-box;
				color: #111;
				cursor: pointer;
				display: inline-flex;
				height: 40px;
				justify-content: center;
				padding: 0;
				pointer-events: auto !important;
				transition: background-color 160ms ease, box-shadow 160ms ease, color 160ms ease, transform 160ms ease;
				width: 40px;
			}

			.ppIconButton:hover,
			.ppIconButton:focus-visible {
				background: #f1f1f1;
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
				transform: scale(1.04);
			}

			.ppIconButton svg {
				display: block;
				height: 12px;
				width: 12px;
			}

			.ppIconButton[disabled] {
				cursor: progress;
				opacity: 0.7;
				transform: none;
			}

			.ppDownloadButton.ppWorking {
				background: #111;
				color: #fff;
			}

			.ppDownloadButton.ppDone {
				background: #0a8f3c;
				color: #fff;
			}

			.ppCopyButton.ppCopied {
				background: #0a8f3c;
				color: #fff;
			}

			.ppSaveButton.ppSaved {
				background: #e60023;
				color: #fff;
			}

			.ppSaveButton.ppSaved:hover,
			.ppSaveButton.ppSaved:focus-visible {
				background: #ad081b;
			}

			.ppDetailDownloadButton {
				flex: 0 0 auto;
				margin-right: 8px;
			}
		`;

		const style = document.createElement("style");
		style.type = "text/css";
		style.id = "pp-style";
		style.textContent = css;
		(document.head || document.documentElement).appendChild(style);
	}

	_StartDownloadObserver() {
		this._InjectDownloadButtons(document);
		this._InjectDetailDownloadButtons(document);

		this._Observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (node.nodeType === Node.ELEMENT_NODE) {
						this._InjectDownloadButtons(node);
						this._InjectDetailDownloadButtons(node);
					}
				}
			}
		});

		this._Observer.observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	}

	_InjectDownloadButtons(root) {
		const cards = new Set([
			...(root.matches?.("[data-test-id='pinWrapper'], [data-test-id='pin'], [data-test-id='pinrep']") ? [root] : []),
			...(root.querySelectorAll?.("[data-test-id='pinWrapper'], [data-test-id='pin'], [data-test-id='pinrep']") || []),
		]);
		const quickSaveButtons = [
			...(root.matches?.("div[data-test-id='quick-save-button']") ? [root] : []),
			...(root.querySelectorAll?.("div[data-test-id='quick-save-button']") || []),
			...(root.matches?.("[data-test-id='pinWrapper'] button[aria-label='保存'], [data-test-id='pinWrapper'] button[aria-label='已收藏']") ? [root.closest("[data-test-id='pinWrapper']")] : []),
			...(root.querySelectorAll?.("[data-test-id='pinWrapper'] button[aria-label='保存'], [data-test-id='pinWrapper'] button[aria-label='已收藏']") || []),
		];

		for (const quickSave of quickSaveButtons) {
			const saveHost = quickSave.matches?.("button") ? quickSave.parentElement : quickSave;
			const card = this._FindPinCard(saveHost);

			if (card != null) {
				cards.add(card);
			}
		}

		if (cards.size === 0) {
			return;
		}

		for (const card of cards) {
			if (!this._IsDownloadableCard(card)) {
				continue;
			}

			card.classList.add("ppCardOverlayHost");

			const existingActionBar = card.querySelector(":scope > .ppCompactActionBar");
			const existingSaveButton = existingActionBar?.querySelector(".ppSaveButton");
			const saveHost = this._FindNativeSaveHost(card);

			if (saveHost != null) {
				saveHost.classList.add("ppNativeSaveHidden");
			}

			if (existingActionBar != null) {
				if (existingSaveButton != null) {
					this._SyncSaveState(saveHost, existingSaveButton);
				}
				continue;
			}

			const actionBar = document.createElement("div");
			actionBar.className = "ppCompactActionBar";

			const copyButton = this._CreateIconButton("ppCopyButton", "复制原图链接", this._CopyIcon());
			const downloadButton = this._CreateIconButton("ppDownloadButton", "下载原图", this._DownloadIcon());
			const saveButton = this._CreateIconButton("ppSaveButton", "保存", this._StarIcon());

			const stop = (e) => {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
			};

			copyButton.addEventListener("mousedown", stop, true);
			copyButton.addEventListener("mouseup", stop, true);
			copyButton.addEventListener("click", async (e) => {
				stop(e);
				await this._CopyFromCard(card, copyButton);
			}, true);

			downloadButton.addEventListener("mousedown", stop, true);
			downloadButton.addEventListener("mouseup", stop, true);
			downloadButton.addEventListener("click", async (e) => {
				stop(e);
				await this._DownloadFromCard(card, downloadButton);
			}, true);

			saveButton.addEventListener("mousedown", stop, true);
			saveButton.addEventListener("mouseup", stop, true);
			saveButton.addEventListener("click", (e) => {
				stop(e);
				this._ClickNativeSave(this._FindNativeSaveHost(card), saveButton);
			}, true);

			this._SyncSaveState(saveHost, saveButton);

			actionBar.appendChild(copyButton);
			actionBar.appendChild(downloadButton);
			actionBar.appendChild(saveButton);
			card.appendChild(actionBar);
		}
	}

	_IsDownloadableCard(card) {
		return card.querySelector("a[href*='/pin/']") != null
			&& card.querySelector(this._MediaSelector) != null;
	}

	_FindNativeSaveHost(card) {
		const button = [
			...card.querySelectorAll(
				"div[data-test-id='quick-save-button'] button," +
				"button[aria-label='保存']," +
				"button[aria-label='已收藏']," +
				"button[aria-label='Save']," +
				"button[aria-label='Saved']"
			),
		].find((item) => item.closest(".ppCompactActionBar") == null);

		if (button == null) {
			return null;
		}

		const saveHost = button.closest("div[data-test-id='quick-save-button']")
			|| button.closest("div[data-test-id='pointer-events-wrapper']")
			|| button.parentElement;

		return saveHost === card || saveHost?.contains?.(card) ? null : saveHost;
	}

	_InjectDetailDownloadButtons(root) {
		const detailSaveButtons = [
			...(root.matches?.("div[data-test-id='PinBetterSaveButton']") ? [root] : []),
			...(root.querySelectorAll?.("div[data-test-id='PinBetterSaveButton']") || []),
		];

		if (detailSaveButtons.length === 0) {
			return;
		}

		for (const saveWrapper of detailSaveButtons) {
			const saveColumn = saveWrapper.closest(".AzXCPS") || saveWrapper.parentElement;
			const row = saveColumn?.parentElement;

			if (saveColumn == null || row == null || row.querySelector(":scope > .ppDetailDownloadButton") != null) {
				continue;
			}

			const downloadButton = this._CreateIconButton("ppDownloadButton ppDetailDownloadButton", "下载原图", this._DownloadIcon());

			const stop = (e) => {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
			};

			downloadButton.addEventListener("mousedown", stop, true);
			downloadButton.addEventListener("mouseup", stop, true);
			downloadButton.addEventListener("click", async (e) => {
				stop(e);
				await this._DownloadFromDetail(downloadButton);
			}, true);

			row.insertBefore(downloadButton, saveColumn);
		}
	}

	_CreateIconButton(className, label, iconMarkup) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = `ppIconButton ${className}`;
		button.title = label;
		button.setAttribute("aria-label", label);
		button.innerHTML = iconMarkup;
		return button;
	}

	_DownloadIcon() {
		return `
			<svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
				<path d="M12 3v11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
				<path d="m7.5 10.5 4.5 4.5 4.5-4.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M5 19h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
			</svg>
		`;
	}

	_CopyIcon() {
		return `
			<svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
				<path d="M9 7h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
				<path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		`;
	}

	_StarIcon() {
		return `
			<svg aria-hidden="true" viewBox="0 0 24 24">
				<path d="m12 2.8 2.86 5.8 6.4.93-4.63 4.51 1.1 6.37L12 17.4l-5.73 3.01 1.1-6.37-4.63-4.51 6.4-.93L12 2.8Z" fill="currentColor"/>
			</svg>
		`;
	}

	_FindPinCard(node) {
		const direct = node.closest("[data-test-id='pinWrapper'], [data-test-id='pin'], [data-test-id='pinrep']");

		if (direct != null) {
			return direct;
		}

		let current = node.parentElement;

		for (let i = 0; i < 12 && current != null; i++) {
			if (current.querySelector("a[href*='/pin/']") != null) {
				return current;
			}

			current = current.parentElement;
		}

		return null;
	}

	async _DownloadFromCard(card, button) {
		try {
			button.disabled = true;
			button.classList.add("ppWorking");

			const result = await this._ResolveCardOriginal(card);

			if (result.urls.length === 0) {
				throw new Error("Cannot resolve original image url.");
			}

			await this._DownloadFirstAvailable(result.urls, result.filename);
			button.classList.add("ppDone");
			setTimeout(() => {
				button.classList.remove("ppDone");
				button.classList.remove("ppWorking");
				button.disabled = false;
			}, 1000);
		}
		catch (error) {
			console.error("Pinterest Plus download failed:", error);
			button.classList.remove("ppWorking");
			button.disabled = false;
		}
	}

	async _CopyFromCard(card, button) {
		try {
			button.disabled = true;

			const result = await this._ResolveCardOriginal(card);
			const url = result.urls[0];

			if (url == null) {
				throw new Error("Cannot resolve original media url.");
			}

			await this._CopyText(url);
			button.classList.add("ppCopied");
			setTimeout(() => {
				button.classList.remove("ppCopied");
				button.disabled = false;
			}, 1000);
		}
		catch (error) {
			console.error("Pinterest Plus copy failed:", error);
			button.disabled = false;
		}
	}

	async _DownloadFromDetail(button) {
		try {
			button.disabled = true;

			const result = await this._ResolveDetailOriginal();

			if (result.urls.length === 0) {
				throw new Error("Cannot resolve detail original image url.");
			}

			await this._DownloadFirstAvailable(result.urls, result.filename);
			button.classList.add("ppDone");
			setTimeout(() => {
				button.classList.remove("ppDone");
				button.disabled = false;
			}, 1000);
		}
		catch (error) {
			console.error("Pinterest Plus detail download failed:", error);
			button.disabled = false;
		}
	}

	_ClickNativeSave(quickSave, saveButton) {
		if (quickSave == null) {
			return;
		}

		const nativeButton = quickSave.querySelector("button");

		if (nativeButton == null) {
			return;
		}

		nativeButton.click();
		setTimeout(() => this._SyncSaveState(quickSave, saveButton), 300);
		setTimeout(() => this._SyncSaveState(quickSave, saveButton), 900);
		setTimeout(() => this._SyncSaveState(quickSave, saveButton), 1800);
	}

	_SyncSaveState(quickSave, saveButton) {
		if (quickSave == null) {
			saveButton.classList.remove("ppSaved");
			saveButton.setAttribute("aria-label", "保存");
			saveButton.title = "保存";
			return;
		}

		const saved = this._IsNativeSaved(quickSave);
		saveButton.classList.toggle("ppSaved", saved);
		saveButton.setAttribute("aria-label", saved ? "已收藏" : "保存");
		saveButton.title = saved ? "已收藏" : "保存";
	}

	_IsNativeSaved(quickSave) {
		const button = quickSave.querySelector("button");
		const text = `${button?.getAttribute("aria-label") || ""} ${button?.textContent || ""}`.trim().toLowerCase();
		return /已收藏|saved/.test(text);
	}

	async _ResolveCardOriginal(card) {
		const img = card.querySelector("img[srcset*='pinimg.com'], img[src*='pinimg.com']");
		const video = card.querySelector("video[src*='pinimg.com'], video source[src*='pinimg.com']");
		const pinId = this._GetPinIdFromCard(card);
		const cacheKey = pinId || img?.currentSrc || img?.src || video?.currentSrc || video?.src || "";

		if (this._PinCache.has(cacheKey)) {
			return this._PinCache.get(cacheKey);
		}

		const urls = [];

		if (pinId != null) {
			const pin = await this._FetchPinData(pinId);
			urls.push(...(pin == null ? [] : this._ExtractPinUrls(pin)));
		}

		urls.push(...this._GetVideoSnippetUrls(card));

		if (img != null) {
			urls.push(...this._GetImageUrlCandidates(img));
		}

		if (video != null) {
			urls.push(...this._GetDisplayedVideoUrlCandidates(video));
		}

		const uniqueUrls = this._UniqueUrls(urls);
		const result = {
			url: uniqueUrls[0] || null,
			urls: uniqueUrls,
			filename: this._BuildDownloadName(uniqueUrls[0] || null, pinId),
		};

		if (uniqueUrls.length > 0) {
			this._PinCache.set(cacheKey, result);
		}

		return result;
	}

	async _ResolveDetailOriginal() {
		const pinId = this._GetPinIdFromText(location.href);
		const cacheKey = pinId == null ? `detail:${location.href}` : pinId;

		if (this._PinCache.has(cacheKey)) {
			return this._PinCache.get(cacheKey);
		}

		const urls = [];

		if (pinId != null) {
			const pin = await this._FetchPinData(pinId);
			urls.push(...(pin == null ? [] : this._ExtractPinUrls(pin)));
		}

		urls.push(...this._GetVideoSnippetUrls(document));

		const img = document.querySelector(
			"div[data-test-id='CloseupMainPin'] img[srcset*='pinimg.com']," +
			"div[data-test-id='CloseupMainPin'] img[src*='pinimg.com']," +
			"img[srcset*='pinimg.com']," +
			"img[src*='pinimg.com']"
		);
		const video = document.querySelector(
			"div[data-test-id='CloseupMainPin'] video[src*='pinimg.com']," +
			"div[data-test-id='CloseupMainPin'] video source[src*='pinimg.com']," +
			"video[src*='pinimg.com']," +
			"video source[src*='pinimg.com']"
		);

		if (img != null) {
			urls.push(...this._GetDisplayedImageUrlCandidates(img));
		}

		if (video != null) {
			urls.push(...this._GetDisplayedVideoUrlCandidates(video));
		}

		const uniqueUrls = this._UniqueUrls(urls);
		const result = {
			url: uniqueUrls[0] || null,
			urls: uniqueUrls,
			filename: this._BuildDownloadName(uniqueUrls[0] || null, pinId),
		};

		if (uniqueUrls.length > 0) {
			this._PinCache.set(cacheKey, result);
		}

		return result;
	}

	_GetOriginalFromImage(img) {
		return this._GetImageUrlCandidates(img)[0] || null;
	}

	_GetImageUrlCandidates(img) {
		const srcset = img.getAttribute("srcset") || "";
		const srcsetUrls = srcset
			.split(",")
			.map((item) => item.trim().split(/\s+/)[0])
			.filter(Boolean);

		const largestSrcsetUrls = [...srcsetUrls].reverse();
		const rawUrls = [
			...largestSrcsetUrls,
			img.currentSrc,
			img.src,
			img.getAttribute("src"),
		].filter(Boolean);

		const originalUrls = rawUrls
			.map((candidate) => this._ToOriginalPinimgUrl(candidate))
			.filter(Boolean);

		return this._UniqueUrls([
			...srcsetUrls.filter((url) => url.includes("/originals/")),
			...originalUrls,
			...rawUrls,
		]);
	}

	_GetDisplayedImageUrlCandidates(img) {
		const srcset = img.getAttribute("srcset") || "";
		const srcsetUrls = srcset
			.split(",")
			.map((item) => item.trim().split(/\s+/)[0])
			.filter(Boolean);

		return this._UniqueUrls([
			img.currentSrc,
			img.src,
			img.getAttribute("src"),
			...[...srcsetUrls].reverse(),
		].filter(Boolean));
	}

	_GetDisplayedVideoUrlCandidates(videoOrSource) {
		const video = videoOrSource.closest?.("video") || videoOrSource;
		const sourceUrls = [...(video.querySelectorAll?.("source[src*='pinimg.com']") || [])]
			.map((source) => source.src || source.getAttribute("src"))
			.filter(Boolean);

		return this._UniqueUrls([
			video.currentSrc,
			video.src,
			video.getAttribute?.("src"),
			...sourceUrls,
		].filter(Boolean));
	}

	_GetVideoSnippetUrls(root) {
		const snippets = [
			...(root.matches?.("script[data-test-id='video-snippet']") ? [root] : []),
			...(root.querySelectorAll?.("script[data-test-id='video-snippet']") || []),
		];
		const urls = [];

		for (const snippet of snippets) {
			try {
				const data = JSON.parse(snippet.textContent || "{}");
				const contentUrls = Array.isArray(data.contentUrl) ? data.contentUrl : [data.contentUrl];
				urls.push(...contentUrls.filter((url) => this._IsDownloadableVideoUrl(url)));
			}
			catch (error) {
				console.warn("Cannot parse Pinterest video snippet:", error);
			}
		}

		return this._UniqueUrls(urls);
	}

	_ToOriginalPinimgUrl(url) {
		try {
			const parsed = new URL(url, location.href);

			if (!parsed.hostname.endsWith("pinimg.com")) {
				return null;
			}

			if (parsed.pathname.includes("/originals/")) {
				return parsed.toString();
			}

			if (/\/\d+x\//.test(parsed.pathname)) {
				parsed.pathname = parsed.pathname.replace(/\/\d+x\//, "/originals/");
				return parsed.toString();
			}
		}
		catch (error) {
			console.error("Invalid image url:", url, error);
		}

		return null;
	}

	_GetPinIdFromCard(card) {
		const link = card.querySelector("a[href*='/pin/']");
		return link == null ? null : this._GetPinIdFromText(link.href || link.getAttribute("href"));
	}

	_GetPinIdFromText(text) {
		if (text == null) {
			return null;
		}

		const match = /\/pin\/([\w-]+)\/?/.exec(text) || /\/(\d+)\/?/.exec(text);
		return match == null ? null : match[1];
	}

	async _FetchPinData(id) {
		try {
			const data = encodeURIComponent(JSON.stringify({
				options: {
					id,
					field_set_key: "detailed",
					noCache: true,
				},
				context: {},
			}));
			const sourceUrl = encodeURIComponent(`/pin/${id}/`);
			const url = `${location.origin}/resource/PinResource/get/?source_url=${sourceUrl}&data=${data}&_=${Date.now()}`;

			const res = await fetch(url, {
				method: "GET",
				headers: {
					"X-Pinterest-PWS-Handler": "www/pin/[id].js",
				},
			});

			if (!res.ok) {
				console.error(`Request failed. Status: ${res.status}`);
				return null;
			}

			const json = await res.json();

			if (json?.resource_response?.status !== "success") {
				console.error(json);
				return null;
			}

			return json.resource_response.data;
		}
		catch (error) {
			console.error("PinResource request failed:", error);
			return null;
		}
	}

	_ExtractPinUrls(pin) {
		const urls = [
			...this._ExtractRecursiveVideoUrls(pin),
			...this._ExtractVideoUrls(pin?.videos),
			...this._ExtractVideoUrls(pin?.video),
			...this._ExtractVideoUrls(pin?.image?.video),
		];

		if (pin?.story_pin_data?.pages != null) {
			for (const page of pin.story_pin_data.pages) {
				urls.push(...this._ExtractVideoUrls(page?.video));
				urls.push(...this._ExtractVideoUrls(page?.blocks?.[0]?.video));
				urls.push(...this._ExtractVideoUrls(page?.blocks?.["0"]?.video));
				urls.push(page?.image?.images?.originals?.url);
				urls.push(page?.blocks?.[0]?.image?.images?.originals?.url);
				urls.push(page?.blocks?.["0"]?.image?.images?.originals?.url);
			}
		}

		urls.push(pin?.images?.orig?.url);

		return this._UniqueUrls(urls.filter(Boolean));
	}

	_ExtractRecursiveVideoUrls(value, seen = new WeakSet()) {
		if (value == null) {
			return [];
		}

		if (typeof value === "string") {
			return this._IsDownloadableVideoUrl(value) ? [value] : [];
		}

		if (typeof value !== "object") {
			return [];
		}

		if (seen.has(value)) {
			return [];
		}

		seen.add(value);

		const urls = [];
		urls.push(...this._ExtractVideoUrls(value));

		for (const [key, child] of Object.entries(value)) {
			if (key === "video_list" || key === "videoList") {
				urls.push(...this._ExtractVideoUrls({ video_list: child }));
				continue;
			}

			if (typeof child === "string") {
				if (this._IsDownloadableVideoUrl(child)) {
					urls.push(child);
				}
				continue;
			}

			urls.push(...this._ExtractRecursiveVideoUrls(child, seen));
		}

		const mp4Urls = urls.filter((url) => !/\.m3u8(\?|$)/i.test(url) && !/\/hls\//i.test(url));
		const hlsUrls = urls.filter((url) => /\.m3u8(\?|$)/i.test(url) || /\/hls\//i.test(url));

		return this._UniqueUrls([...mp4Urls, ...hlsUrls]);
	}

	_ExtractVideoUrls(video) {
		if (video == null) {
			return [];
		}

		const directUrls = [
			video.url,
			video.video_url,
			video.videoUrl,
			video.original_url,
			video.originalUrl,
		].filter((url) => this._IsDownloadableVideoUrl(url));
		const isHlsUrl = (url) => /\.m3u8(\?|$)/i.test(url) || /\/hls\//i.test(url);

		const formats = video.video_list || video.videoList;

		if (formats == null) {
			return directUrls;
		}

		const entries = Object.entries(formats)
			.map(([key, value]) => ({
				key,
				url: value?.url,
				width: Number(value?.width || 0),
				height: Number(value?.height || 0),
			}))
			.filter((entry) => entry.url != null);

		const score = (entry) => {
			const keyScore = /1080/.test(entry.key) ? 3 : /720/.test(entry.key) ? 2 : /540|480/.test(entry.key) ? 1 : 0;
			return entry.width * entry.height + keyScore;
		};
		const isHls = (entry) => isHlsUrl(entry.url) || /hls/i.test(entry.key);
		const mp4Urls = entries
			.filter((entry) => !isHls(entry))
			.sort((a, b) => score(b) - score(a))
			.map((entry) => entry.url);
		const hlsUrls = entries
			.filter(isHls)
			.sort((a, b) => score(b) - score(a))
			.map((entry) => entry.url);

		return this._UniqueUrls([
			...directUrls.filter((url) => !isHlsUrl(url)),
			...mp4Urls,
			...directUrls.filter(isHlsUrl),
			...hlsUrls,
		]);
	}

	async _DownloadFirstAvailable(urls, filename) {
		const errors = [];

		for (const url of urls) {
			try {
				await this._DownloadUrlNoOpenFallback(url, this._BuildDownloadName(url, null) || filename);
				return;
			}
			catch (error) {
				console.warn("Download candidate failed:", url, error);
				errors.push(error);
			}
		}

		throw errors[0] || new Error("All download candidates failed.");
	}

	async _DownloadUrlNoOpenFallback(url, filename) {
		try {
			await this._DownloadWithGMDownload(url, filename);
			return;
		}
		catch (error) {
			console.warn("GM_download failed or timed out, trying blob fallback:", error);
		}

		try {
			await this._DownloadWithGMRequest(url, filename);
			return;
		}
		catch (error) {
			console.warn("GM_xmlhttpRequest fallback failed:", error);
		}

		throw new Error(`Cannot download url: ${url}`);
	}

	async _CopyText(text) {
		if (typeof GM_setClipboard === "function") {
			GM_setClipboard(text, "text");
			return;
		}

		if (globalThis.GM != null && typeof GM.setClipboard === "function") {
			await GM.setClipboard(text, "text");
			return;
		}

		if (navigator.clipboard != null && typeof navigator.clipboard.writeText === "function") {
			await navigator.clipboard.writeText(text);
			return;
		}

		throw new Error("Clipboard API is unavailable.");
	}

	async _DownloadWithGMDownload(url, filename) {
		if (typeof GM_download === "function") {
			await this._WithTimeout(new Promise((resolve, reject) => {
				GM_download({
					url,
					name: filename,
					saveAs: false,
					timeout: 30000,
					onload: resolve,
					onerror: reject,
					ontimeout: reject,
				});
			}), 25000, "GM_download timeout");
			return;
		}

		if (globalThis.GM != null && typeof GM.download === "function") {
			await this._WithTimeout(GM.download({
				url,
				name: filename,
				saveAs: false,
			}), 25000, "GM.download timeout");
			return;
		}

		throw new Error("GM_download is unavailable.");
	}

	async _DownloadWithGMRequest(url, filename) {
		const blob = await this._RequestBlob(url);
		const objectUrl = URL.createObjectURL(blob);

		try {
			this._ClickDownloadLink(objectUrl, filename);
		}
		finally {
			setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
		}
	}

	async _RequestBlob(url) {
		if (typeof GM_xmlhttpRequest === "function") {
			return await this._WithTimeout(new Promise((resolve, reject) => {
				GM_xmlhttpRequest({
					method: "GET",
					url,
					responseType: "blob",
					timeout: 30000,
					onload: (res) => {
						if (res.status >= 200 && res.status < 300 && res.response instanceof Blob) {
							resolve(res.response);
						}
						else {
							reject(new Error(`GM_xmlhttpRequest failed: ${res.status}`));
						}
					},
					onerror: reject,
					ontimeout: reject,
				});
			}), 35000, "GM_xmlhttpRequest timeout");
		}

		if (globalThis.GM != null && typeof GM.xmlHttpRequest === "function") {
			const res = await this._WithTimeout(GM.xmlHttpRequest({
				method: "GET",
				url,
				responseType: "blob",
				timeout: 30000,
			}), 35000, "GM.xmlHttpRequest timeout");

			if (res.status >= 200 && res.status < 300 && res.response instanceof Blob) {
				return res.response;
			}

			throw new Error(`GM.xmlHttpRequest failed: ${res.status}`);
		}

		const res = await this._WithTimeout(fetch(url, { credentials: "omit" }), 30000, "fetch timeout");

		if (!res.ok) {
			throw new Error(`fetch failed: ${res.status}`);
		}

		return await res.blob();
	}

	_WithTimeout(promise, ms, message) {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error(message)), ms);
			Promise.resolve(promise).then(
				(value) => {
					clearTimeout(timer);
					resolve(value);
				},
				(error) => {
					clearTimeout(timer);
					reject(error);
				}
			);
		});
	}

	_ClickDownloadLink(url, filename) {
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.rel = "noopener";
		a.style.display = "none";
		document.body.appendChild(a);
		a.click();
		a.remove();
	}

	_UniqueUrls(urls) {
		const seen = new Set();
		const result = [];

		for (const url of urls) {
			if (url == null || seen.has(url)) {
				continue;
			}

			seen.add(url);
			result.push(url);
		}

		return result;
	}

	_BuildDownloadName(url, pinId) {
		let fileName = "pinterest-original";

		try {
			if (url != null) {
				const parsed = new URL(url, location.href);
				fileName = decodeURIComponent(parsed.pathname.split("/").pop() || fileName);
			}
		}
		catch {
			fileName = "pinterest-original";
		}

		if (!/\.[a-z0-9]{2,5}$/i.test(fileName)) {
			fileName += this._LooksLikeVideoUrl(url) ? ".mp4" : ".jpg";
		}

		return pinId == null ? fileName : `pinterest-${pinId}-${fileName}`;
	}

	_LooksLikeVideoUrl(url) {
		return this._IsDownloadableVideoUrl(url);
	}

	_IsDownloadableVideoUrl(url) {
		if (url == null) {
			return false;
		}

		return /\.(mp4|m4v|webm|mov|m3u8)(\?|$)/i.test(url) || /\/hls\//i.test(url);
	}

}

new PinterestPlus();
