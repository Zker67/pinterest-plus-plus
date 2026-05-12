// ==UserScript==
// @name         Pinterest++
// @namespace    https://github.com/zker67/pinterest++
// @description  Add compact Pinterest-style buttons for original image download and save state.
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
// @version      0.8.09
// @grant        GM_download
// @grant        GM.download
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      i.pinimg.com
// @connect      *.pinimg.com
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/zker67/pinterest++/main/pinterest++.user.js
// @updateURL    https://raw.githubusercontent.com/zker67/pinterest++/main/pinterest++.user.js
// ==/UserScript==

class PinterestPlus {
	_Observer = null;
	_PinCache = new Map();

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
				background: rgba(255, 255, 255, 0.96);
				border: 0;
				border-radius: 999px;
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
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
				background: #fff;
				box-shadow: 0 3px 12px rgba(0, 0, 0, 0.24);
				transform: scale(1.04);
			}

			.ppIconButton svg {
				display: block;
				height: 18px;
				width: 18px;
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
		const quickSaveButtons = [
			...(root.matches?.("div[data-test-id='quick-save-button']") ? [root] : []),
			...(root.querySelectorAll?.("div[data-test-id='quick-save-button']") || []),
		];

		if (quickSaveButtons.length === 0) {
			return;
		}

		for (const quickSave of quickSaveButtons) {
			const host = quickSave.closest("div[data-test-id='pointer-events-wrapper']") || quickSave.parentElement;

			if (host == null) {
				continue;
			}

			const card = this._FindPinCard(quickSave);

			if (card == null || card.querySelector("img[src*='pinimg.com'], img[srcset*='pinimg.com']") == null) {
				continue;
			}

			if (card.querySelector(":scope > .ppCompactActionBar") != null) {
				quickSave.classList.add("ppNativeSaveHidden");
				continue;
			}

			card.classList.add("ppCardOverlayHost");
			quickSave.classList.add("ppNativeSaveHidden");

			const actionBar = document.createElement("div");
			actionBar.className = "ppCompactActionBar";

			const downloadButton = this._CreateIconButton("ppDownloadButton", "下载原图", this._DownloadIcon());
			const saveButton = this._CreateIconButton("ppSaveButton", "保存", this._StarIcon());

			const stop = (e) => {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
			};

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
				this._ClickNativeSave(quickSave, saveButton);
			}, true);

			this._SyncSaveState(quickSave, saveButton);

			const saveObserver = new MutationObserver(() => {
				this._SyncSaveState(quickSave, saveButton);
			});
			saveObserver.observe(quickSave, {
				attributes: true,
				childList: true,
				subtree: true,
			});

			actionBar.appendChild(downloadButton);
			actionBar.appendChild(saveButton);
			card.appendChild(actionBar);
		}
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
			if (
				current.querySelector("a[href*='/pin/']") != null &&
				current.querySelector("img[src*='pinimg.com'], img[srcset*='pinimg.com']") != null
			) {
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

			if (result.url == null) {
				throw new Error("Cannot resolve original image url.");
			}

			await this._DownloadUrlWithOpenFallback(result.url, result.filename);
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
		const pinId = this._GetPinIdFromCard(card);
		const cacheKey = pinId || img?.currentSrc || img?.src || "";

		if (this._PinCache.has(cacheKey)) {
			return this._PinCache.get(cacheKey);
		}

		const urls = [];

		if (pinId != null) {
			const pin = await this._FetchPinData(pinId);
			urls.push(...(pin == null ? [] : this._ExtractPinUrls(pin)));
		}

		if (img != null) {
			urls.push(...this._GetImageUrlCandidates(img));
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

		const img = document.querySelector(
			"div[data-test-id='CloseupMainPin'] img[srcset*='pinimg.com']," +
			"div[data-test-id='CloseupMainPin'] img[src*='pinimg.com']," +
			"img[srcset*='pinimg.com']," +
			"img[src*='pinimg.com']"
		);

		if (img != null) {
			urls.push(...this._GetDisplayedImageUrlCandidates(img));
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
		if (pin?.videos?.video_list != null) {
			const key = Object.keys(pin.videos.video_list)[0];
			const url = pin.videos.video_list[key]?.url;
			return url == null ? [] : [url];
		}

		if (pin?.story_pin_data?.pages != null) {
			return pin.story_pin_data.pages
				.map((page) => page?.image?.images?.originals?.url || page?.blocks?.[0]?.image?.images?.originals?.url)
				.filter(Boolean);
		}

		const imageUrl = pin?.images?.orig?.url;
		return imageUrl == null ? [] : [imageUrl];
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

	async _DownloadUrlWithOpenFallback(url, filename) {
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
			console.warn("GM_xmlhttpRequest fallback failed, opening original:", error);
		}

		this._OpenOriginal(url);
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

	_OpenOriginal(url) {
		window.open(url, "_blank", "noopener");
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
			fileName += ".jpg";
		}

		return pinId == null ? fileName : `pinterest-${pinId}-${fileName}`;
	}

}

new PinterestPlus();
