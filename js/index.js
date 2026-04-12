/*
Author      : Sherebiah Tisbi & Vincent L
Date Written: 03/21/2022
Goal        : script pertains to index.html and caontains the code for almost entire app
Change Log  : 05/09/2020 - MP3 duration for each download call
              05/18/2020 - Play All functionality
              05/20/2020 - code refactoring, open website externally, open pdf externally
*/
const needle = require('needle');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { fileURLToPath, pathToFileURL } = require('url');
const { shell } = require('electron');

const logger = require('electron-log/renderer');
const SITE_ORIGIN = 'https://sermonindex.net';
const sermonDetailCache = new Map();

var speakerData, topicData, sermonData, speakerFolder,  audioDuration, media, medialist, currentTrackIndex, mediaButton, playallButton;
var menuState, countDownload, countPlayable, currentTab, sermonSortCol, sermonSortorder;
var track, buttonPrevTrack, buttonNextTrack, mediaBarTitle, mediaDuration, buttonDownloadAll, speakerHtmlTable, sermonHtmlTable;
var toolTipableElements, categoryListStatusbar, sermonListStatusbar, sermonSortableColumns, tabCategories;
var txtSermonFilter, txtCategoryFilter, slidingMenuSwitch, slidingMenubar, btnAboutPopupClose, bodyFadder, aboutPopup, menuAbout, website;
var speakerSortorder;

var elemCurrentPlayingCell, elemMediaButton; 
var playIcon = "<i class='fas fa-play'></i>";
var pauseIcon = "<i class='fas fa-pause'></i>";
var downloadIcon = "<i class='fas fa-download'></i>";
var downloadAllIcon = "<i class='fas fa-bars'></i> &nbsp; <i class='fas fa-download'></i>";
var spinnerIcon = "<i class='fas fa-cog fa-spin'></i>";
var folderIcon = "<i class='fas fa-folder-open'></i>";
var successIcon = "<i class='far fa-check-circle'></i>";
var failIcon = "<i class='far fa-exclamation-circle'></i>";
var speakerIcon = "<i class='fas fa-user'></i>";
var pdfIcon = "<i class='far fa-file-pdf'></i>";
var iconSortasc = "<i class='fas fa-sort-alpha-up'></i>";
var iconSortdes = "<i class='fas fa-sort-alpha-down-alt'></i>";
var iconTopic = "<i class='fas fa-file-alt'></i>"
var iconLeftArrow = '<i class="fas fa-angle-left">';
var iconRightArrow = '<i class="fas fa-angle-right">';
var iconPlayallplay = '<i class="fas fa-bars"></i> &nbsp; <i class="fas fa-play"></i>';
var iconPlayallpause = '<i class="fas fa-bars"></i> &nbsp; <i class="fas fa-pause"></i>';

/* Enums */
const MEDIA_STATE = { PLAYING: 'playing', PAUSED: 'paused', ENDED: 'ended' ,UNKNOWN: 'unknown'}

$(document).ready(function () {
    // console.log(window.localStorage.getItem('sermon-download-path'))

    logger.info('GUI is initialized.');

    let basePath = window.localStorage.getItem('sermon-download-path')
    if (!basePath) {
        logger.info('No download path has been defined, setting to default...')
        basePath = path.join(os.homedir(), 'SermonIndex_Sermons')
        window.localStorage.setItem('sermon-download-path', basePath)
    }

    RebuildFolderTree(basePath) // Ensure the folder tree is intact

    $("#divSermonStatus").hide();

    //collect some important controls as variable
    track = $('#mediaBar');
    mediaButton = $('#btnStopMedia');
    playallButton = $("#btnPlayAll");
    buttonPrevTrack = $("#btnPrev");
    buttonNextTrack = $("#btnNext");
    mediaBarTitle = $("#spanAudioTitle");
    mediaDuration = $("#spanAudioStatus");

    buttonDownloadAll = $("#btnDownloadAll");
    speakerHtmlTable = $("#tblSpeakers");
    sermonHtmlTable = $("#tblSermons");
    toolTipableElements = $('[data-toggle="tooltip"]');
    categoryListStatusbar = $('#spanSpeakerAlert');
    sermonListStatusbar = $('#spanPlayAlert');
    sermonSortableColumns = $(".sortable");
    tabCategories = $("#ulCateory li");
    
    txtSermonFilter = $('#txtsermonsearch');
    txtCategoryFilter = $('#txtsearch');

    slidingMenuSwitch = $("#menuPointer");
    slidingMenubar = $("#menuBar");
    btnAboutPopupClose = $("#btnCloseAbout")
    bodyFadder = $("#divFadebody");
    aboutPopup = $("#divAbout");
    menuAbout = $("#aAbout");  
    website = $("#aWebsite");
    
    slidingMenubar.removeClass('openmenu').addClass('closemenu');
    menuState = false;
    bodyFadder.hide();
    aboutPopup.hide();
    currentTab = "Speakers";
    sermonSortCol = "title";
    sermonSortorder = "asc";
    speakerSortorder = "asc";

    //load speakers when app loads
    loadSpeakers();
    media = new Audio();
    updateMediaInfo(MEDIA_STATE.UNKNOWN);

    // register event handlers for dynamically created elements
    speakerHtmlTable.on('click', 'tr td', loadSermons);
    sermonHtmlTable.on('click', 'tbody .sermon-action-play', playSermonInApp);
    sermonHtmlTable.on('click', 'tbody .sermon-action-download', avOrIOaction);
    sermonHtmlTable.on('click', 'tbody .sermon-action-pdf', openSermonDocument);
    sermonHtmlTable.on('click', 'tbody td:nth-child(3)', showSermonDescription);

    // register event handlers for media
    media.addEventListener('play', setUIPlaying);
    media.addEventListener('pause', setUIPaused);
    media.addEventListener('ended', setUIEnded);
    media.addEventListener('canplaythrough', setDuration);
    media.addEventListener('timeupdate', setTimeupdate);

    //register event handlers for static ee
    toolTipableElements.tooltip();
    sermonSortableColumns.on('click', sortSermons);
    tabCategories.on('click', manageCategoryNavigation);
    playallButton.on('click', playAllsermons);
    menuAbout.on('click', (e) => { aboutPopup.show(); });
    btnAboutPopupClose.on('click', (e) => { aboutPopup.hide(); });
    slidingMenuSwitch.on('click', slidingMenuShowHide);
    buttonDownloadAll.on('click', downloadAll);
    track.on('change', changeMediaPosition);
    mediaButton.on('click', togglePlay);
    txtCategoryFilter.on('input', applyCategoryFilter);
    txtSermonFilter.on('input', applySermonFilter);
    buttonPrevTrack.on('click', playPrevTrack);
    buttonNextTrack.on('click', playNextTrack);
    website.on('click',openWebsite);
});

// functions for getting our base path & paths for speakers, topics, etc
function GetBasePath() {
    return window.localStorage.getItem('sermon-download-path')
}

function GetTopicPath(speaker) {
    return path.join(GetBasePath(), 'Topics', sanitizePathSegment(speaker.topic))
}

function GetSpeakerPath(speaker) {
    return path.join(GetBasePath(), 'Speakers', sanitizePathSegment(speaker.speaker_name))
}

function RebuildFolderTree(basePath) {
    logger.info('Rebuilding folder tree...')
    let paths = [
        basePath,
        path.join(basePath, 'Topics'),
        path.join(basePath, 'Speakers'),
    ]

    for (let i = 0; i < paths.length; i++) {
        let path = paths[i]
        if (!fs.existsSync(path)) {
            logger.info(`RebuildFolderTree: Path ${ path } does not exist, rebuilding!`)
            fs.mkdirSync(path)
        } else {
            logger.info(`RebuildFolderTree: Path ${ path } does exist!, skipping!`)
        }
    }
}

// Called from main process since localStorage changes do not trigger events when modified from the same window?
function OnPathUpdate() { RebuildFolderTree(GetBasePath()) }

function getSermonFilePathFromCell(cell) {
    return cell.dataset['filepath'];
}

function normalizeExternalUrl(rawUrl) {
    return rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
        ? rawUrl
        : `https://${rawUrl}`;
}

function getCurrentMediaPath() {
    if (!media || !media.src) {
        return '';
    }

    try {
        return path.normalize(fileURLToPath(media.src));
    } catch {
        return '';
    }
}

function isCurrentMediaFile(filepath) {
    return getCurrentMediaPath() === path.normalize(filepath);
}

function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
}

function normalizeCollectionDisplayName(text) {
    return normalizeText(text)
        .replace(/^\d+\s+/, '')
        .replace(/\s+\d+$/, '');
}

function sanitizePathSegment(name) {
    return normalizeText(name).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

function getAbsoluteSiteUrl(relativeOrAbsoluteUrl) {
    return new URL(relativeOrAbsoluteUrl, SITE_ORIGIN).href;
}

async function fetchSiteDocument(relativeOrAbsoluteUrl) {
    const url = getAbsoluteSiteUrl(relativeOrAbsoluteUrl);
    const response = await needle('get', url, {
        follow_max: 5,
        headers: {
            'User-Agent': 'Sermon Downloader 2.1',
        }
    });

    if (response.statusCode >= 400) {
        throw new Error(`Unexpected status code ${ response.statusCode } for ${ url }`);
    }

    const html = typeof response.body === 'string'
        ? response.body
        : JSON.stringify(response.body);

    return new DOMParser().parseFromString(html, 'text/html');
}

function getCollectionDisplayName(collection, slug) {
    if (!collection || !collection[slug]) {
        return formattedName(slug);
    }

    return collection[slug].displayName || formattedName(slug);
}

function extractCollectionSlug(href, collectionName) {
    const match = (href || '').match(new RegExp(`^\\/${ collectionName }\\/([^/]+)\\/$`));
    return match ? match[1] : '';
}

function inferSermonFormat(card) {
    const mediaType = normalizeText(card.querySelector('.topic-sermon-type')?.textContent || '').toLowerCase();

    if (card.dataset.hasAudio === '1' || mediaType.includes('audio')) {
        return 'mp3';
    }

    if (card.dataset.isVideo === '1' || mediaType.includes('video')) {
        return 'mp4';
    }

    if (card.dataset.hasTranscript === '1' || mediaType.includes('text') || mediaType.includes('transcript')) {
        return 'pdf';
    }

    return 'html';
}

function getPrimaryActionTitle(cell) {
    return fs.existsSync(getSermonFilePathFromCell(cell))
        ? 'Open downloaded file'
        : 'Download';
}

function buildActionButtonMarkup({ buttonClass, title, iconMarkup, toneClass = '' }) {
    const classNames = ['sermon-action-button', buttonClass];
    if (toneClass) {
        classNames.push(toneClass);
    }

    return `<button type="button" class="${ classNames.join(' ') }" title="${ title }" aria-label="${ title }">${ iconMarkup }</button>`;
}

function getActionCellMarkup(cellLike, options = {}) {
    if (options.loading) {
        return "<span class='sermon-downloading'>" + spinnerIcon + "</span>";
    }

    if (options.failed) {
        return "<span class='sermon-failed-download'>" + failIcon + "</span>";
    }

    const hasAudio = cellLike.dataset['hasaudio'] === '1';
    const hasDocument = cellLike.dataset['hasdocument'] === '1';
    const downloadedPrimary = fs.existsSync(cellLike.dataset['filepath']);
    const markup = [];

    if (hasAudio) {
        markup.push(buildActionButtonMarkup({
            buttonClass: 'sermon-action-play',
            title: 'Play in app',
            iconMarkup: playIcon,
            toneClass: 'playable',
        }));
    }

    markup.push(buildActionButtonMarkup({
        buttonClass: 'sermon-action-download',
        title: getPrimaryActionTitle(cellLike),
        iconMarkup: downloadedPrimary ? folderIcon : downloadIcon,
    }));

    if (hasDocument) {
        markup.push(buildActionButtonMarkup({
            buttonClass: 'sermon-action-pdf',
            title: 'Open PDF / transcript',
            iconMarkup: pdfIcon,
            toneClass: 'sermon-nonaudio',
        }));
    }

    return `<div class="sermon-action-group">${ markup.join('') }</div>`;
}

function refreshActionCell(cell, options = {}) {
    cell.innerHTML = getActionCellMarkup(cell, options);
}

function parseSermonCard(card, selectedName) {
    const titleLink = card.querySelector('a.topic-sermon-title') || card.querySelector('.topic-sermon-header a');
    if (!titleLink) {
        return null;
    }

    const mediaType = normalizeText(card.querySelector('.topic-sermon-type')?.textContent || '').toLowerCase();
    const hasAudio = card.dataset.hasAudio === '1' || mediaType.includes('audio');
    const hasVideo = card.dataset.isVideo === '1' || mediaType.includes('video');
    const hasDocument = card.dataset.hasTranscript === '1' || mediaType.includes('text') || mediaType.includes('transcript');
    const topicTags = [...card.querySelectorAll('.topic-tag-plain:not(.topic-tag-bible-plain)')]
        .map((tag) => normalizeText(tag.textContent))
        .filter(Boolean);
    const scriptureTags = [...card.querySelectorAll('.topic-tag-bible-plain')]
        .map((tag) => normalizeText(tag.textContent))
        .filter(Boolean);
    const speakerLink = card.querySelector('a.topic-sermon-speaker');
    const imageAlt = card.querySelector('.topic-sermon-photo')?.getAttribute('alt') || '';

    return {
        title: normalizeText(titleLink.textContent),
        topic: currentTab === 'Speakers' ? (topicTags[0] || 'General') : selectedName,
        speaker_name: currentTab === 'Speakers'
            ? selectedName
            : normalizeText(speakerLink?.textContent || imageAlt),
        preacher_name: currentTab === 'Speakers'
            ? selectedName
            : normalizeText(speakerLink?.textContent || imageAlt),
        format: hasAudio ? 'mp3' : inferSermonFormat(card),
        has_audio: hasAudio,
        has_video: hasVideo,
        has_document: hasDocument,
        description: normalizeText(card.querySelector('.topic-sermon-desc')?.textContent || ''),
        scripture: scriptureTags.join(', '),
        detail_url: getAbsoluteSiteUrl(titleLink.getAttribute('href')),
        download: '',
        duration_text: normalizeText(card.querySelector('.topic-sermon-duration')?.textContent || '0.00'),
    };
}

async function fetchCollectionIndex(collectionName) {
    const collection = {};
    const mergeCollectionPage = (document) => {
        const prefix = `/${ collectionName }/`;

        for (const link of document.querySelectorAll(`a[href^="${ prefix }"]`)) {
            const href = link.getAttribute('href');
            const slug = extractCollectionSlug(href, collectionName);
            const displayName = normalizeCollectionDisplayName(link.textContent);

            if (!slug || slug.startsWith('letter-') || !displayName) {
                continue;
            }

            if (!collection[slug] || displayName.length > collection[slug].displayName.length) {
                collection[slug] = { displayName };
            }
        }
    };

    mergeCollectionPage(await fetchSiteDocument(`/${ collectionName }/`));

    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    await Promise.all(alphabet.map(async (letter) => {
        try {
            mergeCollectionPage(await fetchSiteDocument(`/${ collectionName }/letter-${ letter }/`));
        } catch (error) {
            logger.warn(`Skipping ${ collectionName } letter page [${ letter }] because it could not be loaded.`);
        }
    }));

    return collection;
}

async function fetchSermonListing(collectionName, slug, selectedName) {
    const document = await fetchSiteDocument(`/${ collectionName }/${ slug }/`);
    return [...document.querySelectorAll('.topic-sermon-card')]
        .map((card) => parseSermonCard(card, selectedName))
        .filter(Boolean);
}

async function resolveSermonMedia(detailUrl) {
    if (sermonDetailCache.has(detailUrl)) {
        return sermonDetailCache.get(detailUrl);
    }

    const resolvePromise = fetchSiteDocument(detailUrl)
        .then((document) => {
            const player = document.querySelector('#si-player');
            const links = [...document.querySelectorAll('a[href]')];
            const findDownloadLink = (extension, label) => {
                const matcher = new RegExp(`\\.${ extension }($|[?#])`, 'i');
                const element = links.find((link) => {
                    const href = link.getAttribute('href') || '';
                    const text = normalizeText(link.textContent);
                    return matcher.test(href) || text.toLowerCase().includes(label);
                });

                return element ? getAbsoluteSiteUrl(element.getAttribute('href')) : '';
            };

            return {
                mp3: findDownloadLink('mp3', 'download mp3')
                    || (player?.dataset.archiveAudio ? getAbsoluteSiteUrl(player.dataset.archiveAudio) : '')
                    || (player?.dataset.audio ? getAbsoluteSiteUrl(player.dataset.audio) : ''),
                mp4: findDownloadLink('mp4', 'download video')
                    || (player?.dataset.archiveVideo ? getAbsoluteSiteUrl(player.dataset.archiveVideo) : ''),
                pdf: findDownloadLink('pdf', 'download pdf'),
                txt: findDownloadLink('txt', 'download txt'),
            };
        })
        .catch((error) => {
            sermonDetailCache.delete(detailUrl);
            throw error;
        });

    sermonDetailCache.set(detailUrl, resolvePromise);
    return resolvePromise;
}

function chooseResolvedMedia(details, preferredFormat) {
    const formatsToTry = [preferredFormat, 'mp3', 'pdf', 'txt', 'mp4'];

    for (const format of formatsToTry) {
        if (details[format]) {
            return {
                format,
                url: details[format],
            };
        }
    }

    return null;
}

function normalizeMediaSource(source) {
    if (/^https?:\/\//i.test(source)) {
        return source;
    }

    return pathToFileURL(source).href;
}

function isCurrentMediaSource(source) {
    return media && media.src === normalizeMediaSource(source);
}

async function resolveSermonMediaForCell(cell) {
    if (cell.dataset['downloadurl']) {
        return {
            url: cell.dataset['downloadurl'],
            filename: cell.dataset['filename'],
            filepath: cell.dataset['filepath'],
            folderpath: cell.dataset['speakerfolder'],
            format: cell.dataset['format'],
        };
    }

    const sermonDetails = await resolveSermonMedia(cell.dataset['detailurl']);
    const selectedMedia = chooseResolvedMedia(sermonDetails, cell.dataset['format']);

    if (!selectedMedia) {
        throw new Error(`No downloadable media found for ${ cell.dataset['sermontitle'] }`);
    }

    const filename = `${ cell.dataset['filestem'] }.${ selectedMedia.format }`;
    const filepath = path.join(cell.dataset['speakerfolder'], filename);

    cell.dataset['downloadurl'] = selectedMedia.url;
    cell.dataset['filename'] = filename;
    cell.dataset['filepath'] = filepath;
    cell.dataset['format'] = selectedMedia.format;

    return {
        url: selectedMedia.url,
        filename,
        filepath,
        folderpath: cell.dataset['speakerfolder'],
        format: selectedMedia.format,
    };
}

/* All event handlers */
// handles the sermon table header click event for sorting 
function sortSermons(e){ 
    var elem = e.currentTarget;

    $('span[class*="sort"]', elem.parentElement).removeClass().addClass('sortInactive');
 
    if (elem.innerText.toLowerCase().indexOf("topic") >= 0) sermonSortCol = 'topic';
    if (elem.innerText.toLowerCase().indexOf("title") >= 0) sermonSortCol = 'title';
    if (elem.innerText.toLowerCase().indexOf("format") >= 0) sermonSortCol = 'format';

    $('span', elem).removeClass('sortInactive').addClass('sortActive');
    
    if (sermonSortorder == 'asc') { 
        $('span', elem).html(iconSortdes);
        sermonSortorder = 'des';
    } else {
        $('span', elem).html(iconSortasc);
        sermonSortorder = 'asc';
    }

    var searchString = txtSermonFilter.val();
    populateSermons(searchString, sermonData).then((res) => { renderSermonTable(res); })
        
    // (currentTab == 'Speakers')
    //     ? populateSermons(searchString, sermonData).then((res) => { renderSermonTable(res); })
    //     : populateSermons(searchString, topicSemonsData).then((res) => { renderSermonTable(res); });
}

// handles the verticle tab click
function manageCategoryNavigation(e){ 
    
    var tmpTab = e.currentTarget.innerText.replace(/\s/g,'');
    if (currentTab == tmpTab) return;

    currentTab = e.currentTarget.innerText.replace(/\s/g, '');
    $('li[class*="cat"]').removeClass('catActive').addClass('catInactive');
    e.currentTarget.classList.add('catActive')
    e.currentTarget.classList.remove('catInactive');
    txtSermonFilter.val('');
    txtCategoryFilter.val('');
    switch (currentTab) {
        case "Speakers":
            loadSpeakers();
            break;
        case "Topics":
            loadTopics();
            break;
        case "Playlist":
            loadPlaylist();
        default:
    }
}

// handles playing all sermons of selected speaker
function playAllsermons(e) {
    if (media.src != '' && medialist.length>0) { 
        if (media.paused) {
            media.play();
        } else {
            media.pause();
        }
        updateMediaInfo(MEDIA_STATE.PLAYING);
        return;        
    }
    medialist = [];
    var sermonsFromTable = $("#tblSermons tbody td:first-child");
    var totalSermons = sermonsFromTable.length;
    for (let index = 0; index < totalSermons; index++) {
        var tmpObj;
        var sermonFormat = sermonsFromTable[index].dataset['format'];
        var filepath = getSermonFilePathFromCell(sermonsFromTable[index]);
        var sermontitle = sermonsFromTable[index].dataset['sermontitle'];

        if (sermonFormat !== 'mp3') {
            continue;
        }

        logger.verbose('>File path : ' + filepath + '\\nSermon title : ' + sermontitle);

        if (fs.existsSync(filepath)) { 
            const playButton = sermonsFromTable[index].querySelector('.sermon-action-play');
            if (!playButton) {
                continue;
            }

            tmpObj = {
                "filename": filepath,
                "sermontitle": sermontitle,
                "domelement": playButton
            };

            medialist.push(tmpObj);
        }
    }
    if (medialist.length > 0) {
        e.currentTarget.innerHTML = iconPlayallpause;
        if (elemCurrentPlayingCell != undefined) elemCurrentPlayingCell.innerHTML = playIcon;
        playMedia(medialist[0].filename, medialist[0].sermontitle);
        elemCurrentPlayingCell = medialist[0].domelement;
        currentTrackIndex = 0;
        if (medialist.length == 1 ) {
            buttonPrevTrack.prop('disabled', true);
            buttonNextTrack.prop('disabled', true);
        } else {
            buttonPrevTrack.prop('disabled', false);
            buttonNextTrack.prop('disabled', false);
        }
    }
}

// handles prevTrack button
function playPrevTrack(e) {
    if (medialist.length > 0 && currentTrackIndex > 0) {
        --currentTrackIndex;
        elemCurrentPlayingCell.innerHTML = playIcon;
        elemCurrentPlayingCell = medialist[currentTrackIndex].domelement;
        playMedia(medialist[currentTrackIndex].filename, medialist[currentTrackIndex].sermontitle);
        (currentTrackIndex == 0) ? buttonPrevTrack.prop('disabled', true) : buttonPrevTrack.prop('disabled', false);
    }
}

// handles nextTrack button
function playNextTrack(e) {
    if (medialist.length > 0 && currentTrackIndex < medialist.length - 1) {
        ++currentTrackIndex;
        elemCurrentPlayingCell.innerHTML = playIcon;
        elemCurrentPlayingCell = medialist[currentTrackIndex].domelement;
        playMedia(medialist[currentTrackIndex].filename, medialist[currentTrackIndex].sermontitle);
        (currentTrackIndex == medialist.length - 1) ? buttonNextTrack.prop('disabled', true) : buttonNextTrack.prop('disabled', false);
    }    
}

// handles opening/closing of left sliding menu bar
function slidingMenuShowHide (e){
    menuState = !(menuState);
    slidingMenubar.toggleClass('openmenu closemenu');
    if (menuState) {
        bodyFadder.show();
        e.currentTarget.classList.add('menupointeropen');
        e.currentTarget.innerHTML = iconLeftArrow;
    } else {
        bodyFadder.hide();
        e.currentTarget.classList.remove('menupointeropen');
        e.currentTarget.innerHTML = iconRightArrow;
    }
}

// handles sermonindex href in the About popup
async function openWebsite(e) {
    e.preventDefault();
    var url = normalizeExternalUrl(e.currentTarget.attributes['href'].value);

    try {
        await shell.openExternal(url);
    } catch (error) {
        logger.error('Failed opening website [' + url + ']\\nError : ' + error);
    }
}

// handles download all button
function downloadAll(e) {
    logger.info('Download All button was pressed.');
    // $("#divSermonStatus").show();
    console.log('Will download all sermons now!');
    var sermonsFromTable = $("#tblSermons tbody td:first-child");
    var totalSermons = sermonsFromTable.length;
    var totalToDownload = countDownload;
    var completedDownloading = 0;

    logger.info('Total sermons : ' + totalSermons);
    for (let index = 0; index < totalSermons; index++) {
        let cell = sermonsFromTable[index];
        let sermonTitle = cell.dataset['sermontitle'];
        let filepath = getSermonFilePathFromCell(cell);

        logger.verbose('>File path : ' + filepath + '\\nSermon title : ' + sermonTitle);

        if (!fs.existsSync(filepath)) {
            sermonListStatusbar.html(spinnerIcon + " downloading [ " + totalToDownload + " ] sermons");
            refreshActionCell(cell, { loading: true });
            resolveSermonMediaForCell(cell)
                .then((resolvedMedia) => downloadSermon(
                    resolvedMedia.url,
                    resolvedMedia.folderpath,
                    resolvedMedia.filename,
                    index,
                    sermonTitle
                ))
                .then((res) => {
                    let resolvedCell = sermonsFromTable[res.index];
                    let resolvedFormat = resolvedCell.dataset['format'];

                    refreshActionCell(resolvedCell);
                    if (countDownload > 0) {
                        --countDownload;
                        buttonDownloadAll.html(downloadAllIcon + " (" + countDownload + ")");
                    }
                    if (resolvedFormat === 'mp3') {
                        ++countPlayable;
                        getMp3Duration(getSermonFilePathFromCell(resolvedCell), undefined)
                            .then((duration) => {
                                resolvedCell.parentElement.children[4].innerHTML = duration;
                                logger.info('MP3 duration calculated successfully for > ' + resolvedCell.dataset['filename']);
                            });
                    }
                    sermonListStatusbar.html(successIcon + " completed downloading [" + ++completedDownloading + " of " + totalToDownload + " ]");
                    logger.info('Downloaded......' + resolvedCell.dataset['filepath']);
                })
                .catch((err) => {
                    // $("#spanPlayAlert").html(failIcon + " Failed downloading > " + sermontitle);
                    if (typeof err.index === 'number' && sermonsFromTable[err.index]) {
                        refreshActionCell(sermonsFromTable[err.index], { failed: true });
                    } else {
                        refreshActionCell(cell, { failed: true });
                    }
                    console.log(err);
                    logger.error('Error downloading....' + sermonTitle + '\\nError:' + err);
                });
        }
    }
}

// handles seeking the media position on media bar
function changeMediaPosition(e) {
    console.log("User changed the media location to >" + e.currentTarget.value);
    if (media.src != '') media.currentTime = e.currentTarget.value;
}

// handle toggling of play/pause button on media bar
function togglePlay(e) {
    if (media.src != '') {
        (media.paused) ? media.play() : media.pause();
    }
}

// handles filtering speaker/topic list as user type in search box
function applyCategoryFilter(e) {
    var txt = $(this).val();
    logger.info('txtsearch>speakerSearch>input handler>applying search.');
    if (txt.length > 0) {
        populateSpeakers(txt);
        populateTopics(txt);
    }
    else {
        populateSpeakers('');
        populateTopics('');
    }
}

// handles filtering sermons as user type in search box
function applySermonFilter(e) {
    var txt = $(this).val();
    logger.info('txtsermonsearch>sermonSearch>input handler>applying search.');
    var searchString;
    (txt.length > 0) ? searchString = txt : searchString = '';
    populateSermons(searchString, sermonData)
        .then((res) => {
            // $("#tblSermons tbody").html(res);
            renderSermonTable(res);
            logger.info('Sermons poulated successfully!');
        })
        .catch(() => {
            logger.info('ERROR : error populating sermons!');
        });
}

/* All functions */

// opens the description on the click of sermon title
function showSermonDescription(e) {
    var description = $('.sermon-description', e.currentTarget);
    if (description.length > 0) {
        description.toggleClass('hideSermonDescription showSermonDescription');
    }
}

// loads the topics list 
function loadTopics() {
    logger.info('Loading topics from sermonindex.net website.');
    $("#spanSpeakerAlert").html(spinnerIcon + ' Loading topics.');
    fetchCollectionIndex('topics')
        .then(function (collection) {
            topicData = collection;

            var topictitle = iconTopic + " Topics (" + Object.keys(collection).length + ")";
            $('#divSpeakerlist').html(topictitle);
            logger.info('Total topics :' + Object.keys(collection).length + ', now populating them.');
            populateTopics('');
            $("#spanSpeakerAlert").html(successIcon + " " + Object.keys(collection).length + ' topics loaded.');
        })
        .catch(function (error) {
            console.log(error);
            logger.error('error fetching topics from sermonindex.net. Error : ' + error);
            $("#spanSpeakerAlert").html(failIcon + " Error loading topics.");
            alert('Error : could not fetch topic data.');
        });
}

//loads the speakers list
function loadSpeakers()
{
    logger.info('Loading speakers from sermonindex.net website.');
    $("#spanSpeakerAlert").html(spinnerIcon + ' Loading Speaker.');
    fetchCollectionIndex('speakers')
        .then(function (collection) {
            speakerData = collection;

            var speakertitle = speakerIcon + " Speakers (" + Object.keys(collection).length + ")";
            $('#divSpeakerlist').html(speakertitle);
            logger.info('Total speakers :' + Object.keys(collection).length + ', now will populating them.');
            populateSpeakers('');
            $("#spanSpeakerAlert").html(successIcon + " " + Object.keys(collection).length + ' speakers loaded.');
        })
        .catch(function (error) {
            console.log(error);
            logger.error('error fetching speakers from sermonindex.net. Error : ' + error);
            $("#spanSpeakerAlert").html(failIcon + " Error loading speakers.");
            alert('Error : could not fetch speakers data.');
        });
}

// downloads sermon if it doesnt exist locally or it starts playing sermon
function avOrIOaction(e) {
    e.preventDefault();
    e.stopPropagation();

    medialist = [];
    currentTrackIndex = undefined;
    var cell = e.currentTarget.closest('td');
    var filepath = cell.attributes['data-filepath'].value;
    var sermonTitle = cell.attributes['data-sermontitle'].value;
    console.log(filepath);
    logger.info('Audio player was clicked for ' + sermonTitle);
    logger.info(`Attributes ${ cell.attributes.keys }`)

    if (fs.existsSync(filepath)) {
        console.log("Open : " + filepath);
        logger.info('sermon [' + sermonTitle +'] exists locallly.');
        openFileExternally(filepath);
        return;
    } else {
        console.log("Download: " + filepath);
        logger.info('Sermon [' + sermonTitle + '] does not exist locally so will download.');
        refreshActionCell(cell, { loading: true });
        sermonListStatusbar.html(spinnerIcon + " downloading [ " + sermonTitle + " ]");
        resolveSermonMediaForCell(cell)
            .then((resolvedMedia) => downloadSermon(
                resolvedMedia.url,
                resolvedMedia.folderpath,
                resolvedMedia.filename,
                -1,
                sermonTitle
            ))
            .then(() => { 
                let resolvedFilepath = cell.dataset['filepath'];
                refreshActionCell(cell);
                sermonListStatusbar.html(successIcon + " completed downloading [ " + sermonTitle + " ]");
                if (countDownload > 0) {
                    --countDownload;
                    buttonDownloadAll.html(downloadAllIcon + " (" + countDownload + ")");
                }
                if (cell.dataset['format'] === 'mp3') {
                    ++countPlayable;
                    getMp3Duration(resolvedFilepath, undefined)
                        .then((duration) => {
                            cell.parentElement.children[4].innerHTML = duration;
                            logger.info('MP3 duration calculated successfully for > ' + cell.dataset['filename']);                        
                        });
                }
                console.log('Download complete...');
                logger.info('Sermon ['+ sermonTitle +'] downloaded successfully');
            })
            .catch((err) => { 
                refreshActionCell(cell, { failed: true });
                console.log(err);
                logger.error('Error downloading [' + sermonTitle + ']\\nError : ' + err);
            });
    }
}

function playSermonInApp(e) {
    e.preventDefault();
    e.stopPropagation();

    medialist = [];
    currentTrackIndex = undefined;
    var cell = e.currentTarget.closest('td');
    var filepath = cell.attributes['data-filepath'].value;
    var sermonTitle = cell.attributes['data-sermontitle'].value;

    logger.info('Play button was clicked for ' + sermonTitle);

    const playButton = cell.querySelector('.sermon-action-play');
    const useSource = (source) => {
        if (elemCurrentPlayingCell && elemCurrentPlayingCell !== playButton) {
            elemCurrentPlayingCell.innerHTML = playIcon;
        }

        elemCurrentPlayingCell = playButton;
        if (media == undefined) {
            playMedia(source, sermonTitle, 0);
            return;
        }

        if (media.paused) {
            if (isCurrentMediaSource(source)) {
                media.play();
            } else {
                playMedia(source, sermonTitle, 0);
            }
        } else if (isCurrentMediaSource(source)) {
            media.pause();
        } else {
            playMedia(source, sermonTitle, 0);
        }
    };

    if (fs.existsSync(filepath) && cell.dataset['format'] === 'mp3') {
        useSource(filepath);
        return;
    }

    sermonListStatusbar.html(spinnerIcon + " loading audio [ " + sermonTitle + " ]");
    resolveSermonMedia(cell.dataset['detailurl'])
        .then((details) => {
            if (!details.mp3) {
                throw new Error('No MP3 stream found for this sermon.');
            }

            useSource(details.mp3);
            sermonListStatusbar.html(successIcon + " ready to play [ " + sermonTitle + " ]");
        })
        .catch((error) => {
            sermonListStatusbar.html(failIcon + " unable to play [ " + sermonTitle + " ]");
            logger.error('Error streaming [' + sermonTitle + ']\\nError : ' + error);
        });
}

function openSermonDocument(e) {
    e.preventDefault();
    e.stopPropagation();

    const cell = e.currentTarget.closest('td');
    const sermonTitle = cell.attributes['data-sermontitle'].value;
    const localPdfPath = path.join(cell.dataset['speakerfolder'], `${ cell.dataset['filestem'] }.pdf`);
    const localTxtPath = path.join(cell.dataset['speakerfolder'], `${ cell.dataset['filestem'] }.txt`);

    if (fs.existsSync(localPdfPath)) {
        openFileExternally(localPdfPath);
        return;
    }

    if (fs.existsSync(localTxtPath)) {
        openFileExternally(localTxtPath);
        return;
    }

    sermonListStatusbar.html(spinnerIcon + " opening transcript [ " + sermonTitle + " ]");
    resolveSermonMedia(cell.dataset['detailurl'])
        .then((details) => {
            const documentUrl = details.pdf || details.txt;
            if (!documentUrl) {
                throw new Error('No PDF or transcript found for this sermon.');
            }

            return shell.openExternal(documentUrl);
        })
        .then(() => {
            sermonListStatusbar.html(successIcon + " opened transcript [ " + sermonTitle + " ]");
        })
        .catch((error) => {
            sermonListStatusbar.html(failIcon + " unable to open transcript [ " + sermonTitle + " ]");
            logger.error('Error opening transcript [' + sermonTitle + ']\\nError : ' + error);
        });
}

// opens the non-audio file using native default application
async function openFileExternally(filename) {
    var errorMessage = await shell.openPath(filename);

    if (errorMessage) {
        logger.error('Failed opening file [' + filename + ']\\nError : ' + errorMessage);
    }
}

// handles when media starts playing
function setUIPlaying(e) {
    console.log('Unpaused.');
    updateMediaInfo(MEDIA_STATE.PLAYING);
}

// handles when media is paused
function setUIPaused(e) {
    updateMediaInfo(MEDIA_STATE.PAUSED);
}

// handles when audio has finished playing 
function setUIEnded(e) {
    elemCurrentPlayingCell.innerHTML = playIcon;
    if (currentTrackIndex < medialist.length - 1) {
        ++currentTrackIndex;
        elemCurrentPlayingCell = medialist[currentTrackIndex].domelement;
        playMedia(medialist[currentTrackIndex].filename, medialist[currentTrackIndex].sermontitle);
    }
    updateMediaInfo(MEDIA_STATE.ENDED);
    console.log('Audio finished playing.');
}

// handls audio duration display
function setDuration(e) {
    audioDuration = e.currentTarget.duration;
    track.attr('max', audioDuration);
    if (medialist.length > 0 && currentTrackIndex >= 0) mediaBarTitle.text(medialist[currentTrackIndex].sermontitle);
    elemCurrentPlayingCell.innerHTML = pauseIcon;
}

// handles updating the audio slider on timeupdate
function setTimeupdate(e) {
    var cTime = e.currentTarget.currentTime;
    track.val(cTime);
    mediaDuration.text('[ ' + (cTime / 60).toFixed(2) + ' / ' + (audioDuration / 60).toFixed(2) + ' ]');
}

// updates all media buttons
function updateMediaInfo(mediastate) {
    mediaButton.html(playIcon);
    playallButton.html(iconPlayallplay);
    if (elemCurrentPlayingCell!= undefined) elemCurrentPlayingCell.innerHTML = playIcon;            
    buttonPrevTrack.prop('disabled', true);
    buttonNextTrack.prop('disabled', true);

    if (medialist != undefined && medialist.length > 0) {
        (currentTrackIndex == 0) ? buttonPrevTrack.prop('disabled', true) : buttonPrevTrack.prop('disabled', false);
        (currentTrackIndex == medialist.length - 1) ? buttonNextTrack.prop('disabled', true) : buttonNextTrack.prop('disabled', false);
        (mediastate == MEDIA_STATE.PLAYING) ? playallButton.html(iconPlayallpause) : playallButton.html(iconPlayallplay);
        elemCurrentPlayingCell = medialist[currentTrackIndex].domelement;
    }

    if (mediastate == MEDIA_STATE.PLAYING) { 
        mediaButton.html(pauseIcon);
        elemCurrentPlayingCell.innerHTML = pauseIcon;
    }
}

// plays selected media
function playMedia(sermonToPlay, sermontitle) {
    if (media.src != '') {
        media.pause();
    }
    media.src = normalizeMediaSource(sermonToPlay);
    media.canPlayType('audio/mpeg');
    media.play()
    mediaButton.removeAttr('disabled');
    sermonListStatusbar.text("Now Playing > " + sermontitle);
    logger.info('Started playing :' + sermontitle);
}

// downloads the sermon 
function downloadSermon(url,folderpath,filename, rowindex, title)
{
    logger.info('downloadSermon()->Entered.');
    var q = $.Deferred();
    var targetPath = path.join(folderpath, filename);
    logger.info('downloadSermon()');   
    var completed = false;
    var settled = false;
    fs.mkdirSync(folderpath, { recursive: true });
    var request = needle.get(url, { follow_max: 5 });
    var file = fs.createWriteStream(targetPath);

    function failDownload() {
        if (settled) {
            return;
        }

        settled = true;

        if (!completed && fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { force: true });
        }

        $("#spanPlayAlert").html(failIcon + " Failed downloading > " + title);
        logger.info('downloadSermon()-> error occurred downloading sermon->' + filename);
        q.reject({ downloaded: false, index: rowindex });
    }

    request.on('response', (response) => {
        if (response.statusCode >= 400) {
            request.destroy(new Error('Unexpected status code ' + response.statusCode));
        }
    });

    request.on('error', failDownload);
    file.on('error', () => {
        request.destroy();
        failDownload();
    });
    file.on('finish', () => {
        completed = true;
        settled = true;
        logger.info('downloadSermon()-> Sermon downloaded successfully->' + filename);
        q.resolve({ downloaded: true, index: rowindex });
    });

    request.pipe(file);
    logger.info('downloadSermon()->Exited.');
    return q.promise();
}

//loads the sermons for the speaker/topic from left list
function loadSermons(e) {
    logger.info('loadSermons()->Entered.');
    
    $("#divSermonStatus").show();
    var collectionName;
    var collectionSlug;
    var selectionName;
    switch (currentTab) {
        case "Speakers":
            var speaker = e.currentTarget.attributes['data-speaker'].value;
            var speakerName = e.currentTarget.innerText;
            collectionName = 'speakers';
            collectionSlug = speaker;
            selectionName = speakerName;
            logger.info('loadSermons()->Fetching sermons from sermonindex.net for speaker >' + speakerName);
            $("#spanPlayAlert").html(spinnerIcon + " Loading Sermons of  > " + speakerName);
            $("#spanSpeakerAlert").html("<b>Selected :</b> [" + speakerName + "]");
            break;
        case "Topics":
            var topic = e.currentTarget.attributes['data-topic'].value;
            var topicName = e.currentTarget.innerText;
            collectionName = 'topics';
            collectionSlug = topic;
            selectionName = topicName;
            logger.info('loadSermons()->Fetching sermons from sermonindex.net for topic >' + topicName);
            $("#spanPlayAlert").html(spinnerIcon + " Loading Sermons on  > " + topicName);
            $("#spanSpeakerAlert").html("<b>Selected :</b> [" + topicName + "]");
            break;
        case "Playlist":
            default:
     }
    fetchSermonListing(collectionName, collectionSlug, selectionName)
        .then(function (sermons) {
            sermonData = sermons;
            logger.info('loadSermons()->Sermons successfully fetched from sermonindex for selection>' + selectionName);
            populateSermons('',sermonData)
                .then((res) => {
                    var sermonListTitle = (currentTab == 'Speakers')
                        ? "<h5>" + speakerName + " (" + sermonData.length + ")</h5>"
                        : "<h5>" + topicName + " (" + sermonData.length + ")</h5>";
                    $('#divSermonlist').html(sermonListTitle);
                    renderSermonTable(res);
                })
                .catch(() => {
                    logger.log("ERROR: error populating sermons!");
                });
        })
        .catch(function (error) {
            alert('Error : could not fetch the data from sermonindex.net');
            console.log(error);
            logger.error('Error : could not fetch the data from sermonindex.net > '+ error);
        });
    logger.info('loadSermons()->Exited.');
}

// renders the dynamic html prepared for all sermons of a sepected speaker/topic
function renderSermonTable(html) {
    $("#tblSermons tbody").html(html);
    logger.info('Sermons poulated successfully!');
    var sermonTable = $("#tblSermons tbody");
    buttonDownloadAll.html(downloadAllIcon + " (" + countDownload + ")");
    // $('[data-toggle="tooltip"]').tooltip();
    loadMp3Duration(sermonTable);    
}

// Fetchs mp3 durations 
function getMp3Duration(mediafile, elementToUpdate) {
    var q = $.Deferred();
    if (!fs.existsSync(mediafile)) { 
        q.reject("0.00");
    } else {
        var tmpMedia = new Audio(pathToFileURL(mediafile).href);
        tmpMedia.oncanplaythrough = (e) => {
            try {
                var tmpDuration = (tmpMedia.duration / 60).toFixed(2);
                if (elementToUpdate != undefined) elementToUpdate.innerHTML = tmpDuration;
                q.resolve(tmpDuration);
            }
            catch {
                q.reject("0.00");
            }
        }
    }
    return q.promise();
}

// wrapper around getMp3Duration for multiple MP3s
function loadMp3Duration(tablerows)
{
    var sermonRows = $('tr', tablerows);
    var filename, cellToupdate;
    for (let i = 0; i < sermonRows.length; i++){
        if (sermonRows[i].children[0].dataset['format'] !== 'mp3') {
            continue;
        }

        filename = sermonRows[i].children[0].dataset['filepath'];
        cellToupdate = sermonRows[i].children[4];
        getMp3Duration(filename, cellToupdate)
            .then(() => { 
                // cellToupdate.innerHTML(res);
            })
            .catch(() => { 
                // cellToupdate.innerHTML("0.00");
            });
    }
}

// populates topic list
function populateTopics(txt) {
    console.log('Rendering the topics...');
    logger.info('populateTopics()->Entered.');

    var html = '';
    logger.info('populateTopics()->generating dynamic html for all topics with search criteria>' + (txt.length > 0 ? txt : 'no search criteria'));
    for (topic in topicData) {
        var tpkname = getCollectionDisplayName(topicData, topic);
        if (txt == '') {
            html += "<tr><td data-topic='" + topic + "'>" + tpkname + "</td></tr>";
        } else {
            if (tpkname.toLowerCase().indexOf(txt.toLowerCase()) >= 0) {
                html += "<tr><td data-topic='" + topic + "'>" + tpkname + "</td></tr>";
            }
        }
        // logger.info('populateSpeakers()->html generated for speaker>'+spkname);
    }
    if (html == '') {
        html = "<tr><td>Sorry, No data!</td></tr>";
        logger.info('populateTopics()->Sorry, No data!');
    } else {
        speakerHtmlTable.html(html);
        logger.info('populateTopics()->dynamic html generated and popultated in GUI.');
    }
    logger.info('populateTopics()->exited.');
}

// populates speakers list
function populateSpeakers(txt) {
    console.log('Rendering the speakers...');
    logger.info('populateSpeakers()->Entered.');

    var html = '';
    logger.info('populateSpeakers()->generating dynamic html for all speakers with search criteria>' + (txt.length > 0 ? txt : 'no search criteria'));

    for (speaker in speakerData) {
        var spkname = getCollectionDisplayName(speakerData, speaker);
        if (txt == '') {
            html += "<tr><td data-speaker='" + speaker + "'>" + spkname + "</td></tr>";
        } else {
            if (spkname.toLowerCase().indexOf(txt.toLowerCase()) >= 0) {
                html += "<tr><td data-speaker='" + speaker + "'>" + spkname + "</td></tr>";
            }
        }
        // logger.info('populateSpeakers()->html generated for speaker>'+spkname);
    }
    if (html == '') {
        html = "<tr><td>Sorry, No data!</td></tr>";    
        logger.info('populateSpeakers()->Sorry, No data!');
    } else {
        speakerHtmlTable.html(html);
        logger.info('populateSpeakers()->dynamic html generated and popultated in GUI.');
    }
    logger.info('populateSpeakers()->exited.');
}

// prepares the dynamic html for sermons list
function populateSermons(searchString,data) {
    var q = $.Deferred();
    countPlayable = countDownload = 0;
    logger.info('populateSermons()->Entered.');
    console.log("Rendering sermons...")
    var html = '';

    data.sort((sermon1, sermon2) => { 
        switch (sermonSortCol) {
            case 'title':
                if (sermonSortorder == 'asc') {
                    return sermon1.title < sermon2.title ? -1 : 1;
                } else {
                    return sermon1.title < sermon2.title ? 1 : -1;
                }
                break;
            case 'format':
                if (sermonSortorder == 'asc') {
                    return sermon1.format < sermon2.format ? -1 : 1;
                } else {
                    return sermon1.format < sermon2.format ? 1 : -1;
                }
                break;
            case 'topic':
                if (sermonSortorder == 'asc') {
                    return sermon1.topic < sermon2.topic ? -1 : 1;
                } else {
                    return sermon1.topic < sermon2.topic ? 1 : -1;
                }
                break; 
            case 'speaker':
                if (sermonSortorder == 'asc') {
                    return sermon1.preacher_name < sermon2.preacher_name ? -1 : 1;
                } else {
                    return sermon1.preacher_name < sermon2.preacher_name ? 1 : -1;
                }
                break;            
            default:
                if (sermonSortorder == 'asc') {
                    return sermon1.title < sermon2.title ? 1 : -1;
                } else {
                    return sermon1.title < sermon2.title ? -1 : 1;
                }
        }
    });

    buttonDownloadAll.attr('disabled', 'disabled');
    try {
        if (data.length == 0) {
            html = "<h3>No Data Available</h3>";
            logger.info('populateSermons()->No data to populate');
            $("#spanPlayAlert").html(failIcon + " No sermons to load!");
        } else {
            logger.info('populateSermons()->popuating sermons with search criteria>' + searchString);
            for (i = 0; i < data.length; i++) {
                if (searchString == '') {

                    html += formattedSermonRow(data[i]);
                } else {
                    if (data[i].topic.toLowerCase().indexOf(searchString.toLowerCase()) >= 0 || data[i].title.toLowerCase().indexOf(searchString.toLowerCase()) >= 0 || data[i].format.toLowerCase().indexOf(searchString.toLowerCase()) >= 0) {
                        html += formattedSermonRow(data[i]);
                    }
                }
            }
            $("#spanPlayAlert").html(successIcon + " Sermons Loaded successfully!");
            logger.info('populateSermons()->sermons loaded in GUI.');
        }
        // $("#tblSermons tbody").html(html);
        q.resolve(html);
    }
    catch {
        q.reject(html);
    }
    logger.info('populateSermons()->Exited.');
    return q.promise();
}

// prepares dynamic html row for single sermon
function formattedSermonRow(sermon)
{
    // logger.info('formattedSermonRow()->Entered.');
    var duration, html;
    var sermontitle = removeQuotes(sermon.title);
    var sermonFilestem = formattedSermontitle(sermon.title);
    var sermonFilename = sermonFilestem + "." + sermon.format;
    var speakerFolder = (currentTab == 'Speakers' ? GetSpeakerPath(sermon) : GetTopicPath(sermon));
    var sermonFilepath = path.join(speakerFolder, sermonFilename);
    var downloaded = fs.existsSync(sermonFilepath);
    var hasAudio = sermon.has_audio || sermon.format == 'mp3';
    var hasDocument = !!sermon.has_document;
    var actionMarkup = getActionCellMarkup({
        dataset: {
            filepath: sermonFilepath,
            format: sermon.format,
            hasaudio: hasAudio ? '1' : '0',
            hasdocument: hasDocument ? '1' : '0',
        }
    });
    duration = sermon.duration_text || '0.00';

    // logger.info('formattedSermonRow()->started generating html for sermon>' + sermontitle);

    if (downloaded) {
        if (sermon.format == 'mp3') {
            playallButton.removeAttr('disabled');
            ++countPlayable;
        }
    } else {
        buttonDownloadAll.removeAttr('disabled');
        ++countDownload;
    }

    var safeDetailUrl = removeQuotes(sermon.detail_url || '');
    var safeDownloadUrl = removeQuotes(sermon.download || '');
    var safeFilepath = removeQuotes(sermonFilepath);
    var safeSpeakerFolder = removeQuotes(speakerFolder);
    var safeFilename = removeQuotes(sermonFilename);
    var safeFilestem = removeQuotes(sermonFilestem);

    html = "";
    html += "<tr>";
    html += "<td class='text-center' data-sermontitle='" + sermontitle + "' data-detailurl='" + safeDetailUrl + "' data-downloadurl='" + safeDownloadUrl + "' data-filepath='" + safeFilepath + "' data-speakerfolder='" + safeSpeakerFolder + "' data-filename='" + safeFilename + "' data-filestem='" + safeFilestem + "' data-format='" + sermon.format + "' data-hasaudio='" + (hasAudio ? '1' : '0') + "' data-hasdocument='" + (hasDocument ? '1' : '0') + "'>" + actionMarkup + "</td>";
    if (currentTab == "Speakers") {
        html += "<td>" + sermon.topic + "</td>";
    } else {
        html += "<td>" + sermon.speaker_name + "</td>";
    }
    
    html += "<td id='cellSermonname'>" + detailedSermonTitle(sermon) + "</td>";
    // html += "<td data-toggle='tooltip' data-placement='right' title='" + sermon.description.replace(/'s/g, '&apos;') + "'>" + detailedSermonTitle(sermon) + "</td>";
    html += "<td>" + sermon.format + "</td>";
    html += "<td>" + duration + "</td>";
    html += "</tr>";
    // logger.info('formattedSermonRow()->completed generating html for > ' + sermontitle);
    // logger.info('formattedSermonRow()->Exited.');
    return html;
}

// prepares dynamic html for sermotitle column with scripture and description
function detailedSermonTitle(sermon) {
    var retTitle = '';
    retTitle = "<div class='sermontitle'>" + sermon.title + "</div>";
    if (sermon.scripture.length > 0) {
        retTitle += "<div class='scripturelist'>" + sermon.scripture.replace(/'s/g, '&apos;') + "</div>";
    }
    if (sermon.description.length > 0) {
        retTitle += "<div class='sermon-description hideSermonDescription'>" + sermon.description.replace(/'s/g, '&apos;') +"</div>";
    }
    return retTitle;
}

// prepares speakerolder in case hwere sermons are listed for a topic

// helper function to cleanup the string from special characters
function formattedSermontitle(title) {
    // logger.info('formattedSermontitle()->Entered.');
    var newtitle = title.replace(/\s/g, "_");
    newtitle = newtitle.replace(/[`~!@#$%^&*()|+=?;:'",.<>\{\}\[\]\\\/]/gi, '_');
    // logger.info('formattedSermontitle()->title formatted successfully removing all special characters.\\nBefore>'+title+'\\nAfter>'+newtitle);
    // logger.info('formattedSermontitle()->Exited.');
    return newtitle;
}

// rhelper function to remove characters which can mess up html
function removeQuotes(title) {
    // logger.info('removeQuotes()->Entered.');
    var newtitle;
    var entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    newtitle = title.replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });
    // logger.info('removeQuotes()->converetd problametic charcaters to html notations.\\nBefore>'+title+'\\nAfter>'+newtitle);
    // logger.info('removeQuotes()->Exited.');
    return newtitle;
}

//format speaker name in proper case
function formattedName(name)
{
    // logger.info('formattedName()->Entered.');
    var speakername = '', speakerarray;
    speakerarray = name.replace(/-/g, '_').split('_');
    for (index = 0; index < speakerarray.length; index++) {
        if (speakerarray[index].length === 0) {
            continue;
        }

        speakername += speakerarray[index][0].toUpperCase() + speakerarray[index].slice(1) + ' ';
    } 
    // logger.info('formattedName()->formatted speaker name.\\nBefore>'+name+'\\nAfter>'+speakername);
    // logger.info('formattedName()->Exited.');
    return speakername;
}

/* DEPRECATED CODE

//handles opening of sermon folder
$("#btnOpenFolder").click(function () {
    console.log("Will show speaker folder");
    logger.info('Openfolder utton clicked.');
    var options = {
        title: $('#divSermonlist').text(),
        defaultPath: (speakerFolder != undefined) ? speakerFolder : sermonbasepath
    }
    ipcRenderer.invoke('showdialog', options);
});

*/
