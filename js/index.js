/*
Author      : Sherebiah Tisbi
Datw Written: 04/27/2020
Goal        : script pertains to index.html and caontains the code for almost entire app
Change Log  : 05/09/2020 - MP3 duration for each download call
              05/18/2020 - Play All functionality
              05/20/2020 - code refactoring, open website externally, open pdf externally
*/
const needle = require('needle');
const download = require('download');
const os = require('os');
const fs = require('fs');
const logger = require('electron-log');
const machine = require('child_process');

var speakerData, topicData, sermonData, speakerFolder,  audioDuration, media, medialist, currentTrackIndex, mediaButton, playallButton;
var menuState, countDownload, countPlayable, currentTab, sermonSortCol, sermonSortorder;

var elemCurrentPlayingCell, elemMediaButton; 
var sermonbasepath = os.homedir() + '/SermonIndex_Sermons/';
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
    //alert('I am ready to roll!');

    logger.info('GUI is initialized.');
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
    sermonHtmlTable.on('click', 'tbody td:first-child', avOrIOaction);
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

    var searchString = txtSermonFilter.text();
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
    txtSermonFilter.text('');
    txtCategoryFilter.text('');
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
    totalSermons = sermonsFromTable.length;
    for (index = 0; index < totalSermons; index++) {
        var tmpObj;

        url = sermonsFromTable[index].dataset['downloadurl'];
        sermonpath = sermonsFromTable[index].dataset['speakerfolder'];
        sermonfilename = sermonsFromTable[index].dataset['filename'];
        sermontitle = sermonsFromTable[index].dataset['sermontitle'];

        logger.verbose('>Sermon : ' + url + '\\n>Speaker folder : ' + sermonpath + '\\nSermon filename : ' + sermonfilename + '\\nSermon title : ' + sermontitle);

        if (fs.existsSync(sermonpath + sermonfilename)) { 
            tmpObj = {
                "filename": sermonpath + sermonfilename,
                "sermontitle": sermontitle,
                "domelement": sermonsFromTable[index].children[0]
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
function openWebsite(e) {
    e.preventDefault();
    var url = e.currentTarget.attributes['href'].value;
    switch (process.platform) {
        case 'darwin':
            machine.execSync('open https://' + url);
            break;
        case 'win32':
            machine.execSync('start https://' + url);
            break;
        case 'linux':
            machine.execSync('xdg-open https://' + url);
            break;
    }    
}

// handles download all button
function downloadAll(e) {
    logger.info('Download All button was pressed.');
    // $("#divSermonStatus").show();
    console.log('Will download all sermons now!');
    var sermonsFromTable = $("#tblSermons tbody td:first-child");
    var url, sermonpath, sermonfilename, sermontitle;
    var downloadedSermons = 0;
    var totalSermons = sermonsFromTable.length;

    logger.info('Speaker data : ' + url);
    logger.info('Total sermons : ' + totalSermons);
    for (index = 0; index < totalSermons; index++) {
        url = sermonsFromTable[index].dataset['downloadurl'];
        sermonpath = sermonsFromTable[index].dataset['speakerfolder'];
        sermonfilename = sermonsFromTable[index].dataset['filename'];
        sermontitle = sermonsFromTable[index].dataset['sermontitle'];

        logger.verbose('>Sermon : ' + url + '\\n>Speaker folder : ' + sermonpath + '\\nSermon filename : ' + sermonfilename + '\\nSermon title : ' + sermontitle);

        if (!fs.existsSync(sermonpath + sermonfilename)) {
            var totalToDownload = countDownload;
            var completedDownloading = 0;
            sermonListStatusbar.html(spinnerIcon + " downloading [ " + totalToDownload + " ] sermons");
            sermonsFromTable[index].children[0].outerHTML = "<span class='sermon-downloading'>" + spinnerIcon + "</span>";
            downloadSermon(url, sermonpath, sermonfilename, index, sermontitle)
                .then((res) => {
                    sermonsFromTable[res.index].children[0].outerHTML = "<span class='playable'>" + playIcon + "</span>";
                    if (countDownload > 0) {
                        --countDownload;
                        buttonDownloadAll.html(downloadAllIcon + " (" + countDownload + ")");
                    }
                    ++countPlayable;
                    getMp3Duration(sermonpath + sermonfilename, undefined)
                        .then((duration) => {
                            sermonsFromTable[res.index].parentElement.children[4].innerHTML = duration;
                            logger.info('MP3 duration calculated successfully for > ' + sermonfilename);
                        });
                    sermonListStatusbar.html(successIcon + " completed downloading [" + ++completedDownloading + " of " + totalToDownload + " ]");
                    logger.info('Downloaded......' + sermonpath);
                })
                .catch((err) => {
                    // $("#spanPlayAlert").html(failIcon + " Failed downloading > " + sermontitle);
                    sermonsFromTable[err.index].children[0].outerHTML = "<span class='sermon-failed-download'>" + failIcon + "</span>";
                    console.log(err);
                    logger.error('Error downloading....' + sermonpath + '\\nError:' + err);
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
    // alert(e.currentTarget.innerText);
    var elem = e.currentTarget;
    if (elem.children.length == 3) {
        $('#divSermondescription', this).toggleClass('hideSermonDescription showSermonDescription');
    }
}

// loads the topics list 
function loadTopics() {
    var apiUrl = 'https://api.sermonindex.net/audio/topic/_sermonindex.json';
    var options = {
        headers: {
            "Content-Type": "application/json"
        }
    }

    logger.info('Loadign Topics from sermonindex API.');
    $("#spanSpeakerAlert").html(spinnerIcon + ' Loading topics.');
    needle('get', apiUrl, options)
        .then(function (response) {
            logger.info('topic JSON received.');
            console.log(response);
            topicData = response.body

            var topictitle = iconTopic + " Topics (" + Object.keys(response.body).length + ")";
            $('#divSpeakerlist').html(topictitle);
            logger.info('Total topics :' + Object.keys(response.body).length + ', now will populating them.');
            populateTopics('');
            $("#spanSpeakerAlert").html(successIcon + " " + Object.keys(response.body).length + ' topics loaded.');
        })
        .catch(function (error) {
            console.log(error);
            logger.error('error fetching topics from sermonindex.com. Error : ' + error);
            $("#spanSpeakerAlert").html(failIcon + " Error loading topics.");
            alert('Error : could not fetch topic data.');
        });
}

//loads the speakers list
function loadSpeakers()
{
    var apiUrl = 'https://api.sermonindex.net/audio/speaker/_sermonindex.json';
    var options = {
        headers: {
            "Content-Type": "application/json"
        }
    }

    logger.info('Loadign speakers from sermonindex API.');
    $("#spanSpeakerAlert").html(spinnerIcon + ' Loading Speaker.');
    needle('get', apiUrl, options)
        .then(function (response) {
            logger.info('Speakers JSON received.');
            console.log(response);
            speakerData = response.body

            var speakertitle = speakerIcon + " Speakers (" + Object.keys(response.body).length + ")";
            $('#divSpeakerlist').html(speakertitle);
            logger.info('Total speakers :' + Object.keys(response.body).length + ', now will populating them.');
            populateSpeakers('');
            $("#spanSpeakerAlert").html(successIcon + " " + Object.keys(response.body).length + ' speakers loaded.');
        })
        .catch(function (error) {
            console.log(error);
            logger.error('error fetching speakers from sermonindex.com. Error : ' + error);
            $("#spanSpeakerAlert").html(failIcon + " Error loading speakers.");
            alert('Error : could not fetch speakers data.');
        });
}

// downloads sermon if it doesnt exist locally or it starts playing sermon
function avOrIOaction(e) {
    medialist = [];
    currentTrackIndex = undefined;
    var filepath = e.currentTarget.attributes['data-filepath'].value;
    var folderpath = e.currentTarget.attributes['data-speakerfolder'].value;
    var filename = e.currentTarget.attributes['data-filename'].value;
    var downloadUrl = e.currentTarget.attributes['data-downloadurl'].value;
    var sermonTitle = e.currentTarget.attributes['data-sermontitle'].value;
    console.log(filepath);
    logger.info('Audio player was clicked for ' + sermonTitle);
    if (fs.existsSync(filepath)) {
        console.log("Play : " + filepath);
        logger.info('sermon [' + sermonTitle +'] exists locallly.');
        if (filename.indexOf('mp3') < 0) {
            // alert("This sermon is not in audio format, can't play!");
            openFileExternally(filepath);
            logger.info('not an autio format.');
            return;
        } else {
            if (elemCurrentPlayingCell != undefined) elemCurrentPlayingCell.innerHTML = playIcon;
            elemCurrentPlayingCell = e.currentTarget.children[0];
            if (media == undefined) {
                playMedia(filepath, sermonTitle, 0);
                logger.info('Now will play [' + filepath + ']');
            } else {
                if (media.paused) {
                    if (media.src.replace('file://','') == filepath) {
                        media.play();
                        logger.info('Unpaused [' + filepath + ']');
                    } else {
                        playMedia(filepath, sermonTitle, 0);
                        logger.info('Now will play [' + filepath + ']');
                    }
                } else {
                    if (media.src.replace('file://','') == filepath) {
                        media.pause();
                        logger.info('Paused [' + filepath + ']');
                    } else {
                        playMedia(filepath, sermonTitle, 0);
                        logger.info('Now will play [' + filepath + ']');
                    }                    
                }
            }
        }
    } else {
        console.log("Download :" + filepath);
        logger.info('Sermon [' + sermonTitle + '] do not exist locally so will download.');
        // $("#divSermonStatus").show();
        e.currentTarget.children[0].outerHTML = "<span class='sermon-downloading'>" + spinnerIcon + "</span>";
        sermonListStatusbar.html(spinnerIcon + " downloading [ " + sermonTitle + " ]");
        downloadSermon(downloadUrl, folderpath, filename, -1,sermonTitle)
            .then((res) => { 
                e.currentTarget.children[0].outerHTML = "<span class='playable'>" + playIcon + "</span>";
                sermonListStatusbar.html(successIcon + " completed downloading [ " + sermonTitle + " ]");
                if (countDownload > 0) {
                    --countDownload;
                    buttonDownloadAll.html(downloadAllIcon + " (" + countDownload + ")");
                }
                getMp3Duration(folderpath + filename, undefined)
                    .then((duration) => {
                        e.currentTarget.parentElement.children[4].innerHTML = duration;
                        logger.info('MP3 duration calculated successfully for > ' + filename);                        
                    });
                console.log('Download complete...');
                logger.info('Sermon ['+ sermonTitle +'] downloaded successfully');
            })
            .catch((err) => { 
                e.currentTarget.children[0].outerHTML = "<span class='sermon-failed-download'>" + failIcon + "</span>";
                console.log(err);
                logger.error('Error downloading [' + sermonTitle + ']\\nError : ' + err);
            });
    }
}

// opens the non-audio file using native default application
function openFileExternally(filename) {
    switch (process.platform) {
        case 'darwin':
            machine.execSync('open ' + filename);
            break;
        case 'win32':
            machine.execSync('start ' + filename);
            break;
        case 'linux':
            machine.execSync('xdg-open ' + filename);
            break;
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
    media.src = sermonToPlay;
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
    var options = { filename: filename }
    var sermonsFromTable; 
    logger.info('downloadSermon()');   
    // $("#spanPlayAlert").html(spinnerIcon + " Started downloading > " + title);
    download(url, folderpath, options)
        .then((res) => {
            // $("#spanPlayAlert").html(successIcon + " Completed downloading > " + title);
            retObject = { downloaded: true, index: rowindex }
            logger.info('downloadSermon()-> Sermon downloaded successfully->' + filename);
            q.resolve(retObject);
        })
        .catch((err) => {
            $("#spanPlayAlert").html(failIcon + " Failed downloading > " + title);
            retObject = { downloaded: false, index: rowindex }
            logger.info('downloadSermon()-> error occurred downloading sermon->' + filename);
            q.reject(retObject);
        });    
    logger.info('downloadSermon()->Exited.');
    return q.promise();
}

//loads the sermons for the speaker/topic from left list
function loadSermons(e) {
    logger.info('loadSermons()->Entered.');
    
    $("#divSermonStatus").show();
    var apiUrl;
    switch (currentTab) {
        case "Speakers":
            var speaker = e.currentTarget.attributes['data-speaker'].value;
            var speakerName = e.currentTarget.innerText;
            speakerFolder = sermonbasepath + speaker + "/";
            apiUrl = 'https://api.sermonindex.net/audio/speaker/' + speaker + ".json";
            console.log(apiUrl);
            logger.info('loadSermons()->Fetching sermons using sermonindex API for speaker >' + speakerName);
            $("#spanPlayAlert").html(spinnerIcon + " Loading Sermons of  > " + speakerName);
            $("#spanSpeakerAlert").html("<b>Selected :</b> [" + speakerName + "]");
            break;
        case "Topics":
            var topic = e.currentTarget.attributes['data-topic'].value;
            var topicName = e.currentTarget.innerText;
            var apiUrl = 'https://api.sermonindex.net/audio/topic/' + topic + '.json';
            console.log(apiUrl);
            logger.info('loadSermons()->Fetching sermons using sermonindex API for speaker >' + speakerName);
            $("#spanPlayAlert").html(spinnerIcon + " Loading Sermons on  > " + topicName);
            $("#spanSpeakerAlert").html("<b>Selected :</b> [" + topicName + "]");            break;
        case "Playlist":
            default:
     }
    var options = {
        follow_max: 5,
        headers: {
            "Content-Type":"application/json"
        }
    }

    needle('get', apiUrl, options)
        .then(function (response) {
            console.log(response);
            sermonData = response.body.sermons;
            logger.info('loadSermons()->Sermons successfully fetched from sermoindex for speaker>' + speakerName);
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
            alert('Error : could not fetch the data from sermnindex.net');
            console.log(error);
            logger.error('Error :  could not fetch the data from sermnindex.net > '+ error);
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
        var tmpMedia = new Audio(mediafile);
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
    for (i = 0; i < sermonRows.length; i++){
        filename = sermonRows[i].children[0].dataset['filepath'];
        cellToupdate = sermonRows[i].children[4];
        getMp3Duration(filename, cellToupdate)
            .then((res) => { 
                // cellToupdate.innerHTML(res);
            })
            .catch((err) => { 
                // cellToupdate.innerHTML("0.00");
            });
    }
}

// populates topic list
function populateTopics(txt) {
    console.log('Rendering the topics...');
    logger.info('populateTopics()->Entered.');

    var html = '';
    logger.info('populateTopics()->generating dynamic html for all topics with search criteria>' + txt.length > 0 ? txt : 'no search criteria');
    for (topic in topicData) {
        var tpkname = formattedName(topic);
        if (txt == '') {
            html += "<tr><td data-topic='" + topic + "'>" + tpkname + "</td></tr>";
        } else {
            if (tpkname.indexOf(txt) >= 0) {
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
    logger.info('populateSpeakers()->generating dynamic html for all speakers with search criteria>' + txt.length > 0 ? txt : 'no search criteria');

    for (speaker in speakerData) {
        var spkname = formattedName(speaker);
        if (txt == '') {
            html += "<tr><td data-speaker='" + speaker + "'>" + spkname + "</td></tr>";
        } else {
            if (speaker.indexOf(txt) >= 0) {
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
    var ficon, duration, html;
    var sermontitle = removeQuotes(sermon.title);
    var sermonFilename = formattedSermontitle(sermontitle) + "." + sermon.format;
    var sermonFilepath;
    if (currentTab != 'Speakers') { 
        speakerFolder = getSpeakerFolder(sermon);
    }
    sermonFilepath = speakerFolder + sermonFilename;

    // logger.info('formattedSermonRow()->started generating html for sermon>' + sermontitle);
    
    if (fs.existsSync(sermonFilepath)) {
        if (sermon.format == 'mp3') {
            ficon = "<span class='playable' data-toggle='tooltip' data-placement='bottom' title='Play'>" + playIcon + "</span>";
            playallButton.removeAttr('disabled');
            ++countPlayable;
        } else {
            ficon = "<span class='sermon-nonaudio' data-toggle='tooltip' data-placement='bottom' title='This is not an audio format so can't play this sermon.>" + pdfIcon + "</span>";
        }
        //duration = getMp3Duration(sermonFilepath);
    } else {
        ficon = "<span data-toggle='tooltip' data-placement='bottom' title='Download'>" + downloadIcon + "</span>";
        // ficon = "<span data-toggle='tooltip' data-placement='bottom' title='Click this icon to download this sermon.'>" + downloadIcon + "</span>";
        buttonDownloadAll.removeAttr('disabled');
        ++countDownload;
    }
    var html = "";
    html += "<tr>";
    html += "<td class='text-center' data-sermontitle='" + sermontitle + "' data-downloadurl='" + sermon.download + "' data-filepath='" + sermonFilepath + "' data-speakerfolder='" + speakerFolder + "' data-filename='" + sermonFilename + "'>" + ficon + "</td>";
    if (currentTab == "Speakers") {
        html += "<td>" + sermon.topic + "</td>";
    } else {
        html += "<td>" + sermon.speaker_name + "</td>";
    }
    
    html += "<td id='cellSermonname'>" + detailedSermonTitle(sermon) + "</td>";
    // html += "<td data-toggle='tooltip' data-placement='right' title='" + sermon.description.replace(/'s/g, '&apos;') + "'>" + detailedSermonTitle(sermon) + "</td>";
    html += "<td>" + sermon.format + "</td>";
    html += "<td>0.00</td>";
    html += "</tr>";
    // logger.info('formattedSermonRow()->completed generating html for > ' + sermontitle);
    // logger.info('formattedSermonRow()->Exited.');
    return html;
}

// prepares dynamic html for sermotitle column with scripture and description
function detailedSermonTitle(sermon) {
    if (sermon.scripture.length == 0) return sermon.title;
    var retTitle = '';
    retTitle = "<div class='sermontitle'>" + sermon.title + "</div>";
    retTitle += "<div class='scripturelist'>" + sermon.scripture.replace(/'s/g, '&apos;') + "</div>";
    retTitle += "<div id='divSermondescription' class='hideSermonDescription'>" + sermon.description.replace(/'s/g, '&apos;') +"</div>";
    return retTitle;
}

// prepares speakerolder in case hwere sermons are listed for a topic
function getSpeakerFolder(topic) {
    var spkcode;

    spkcode = topic.speaker_name.replace(/\s\s/g, ' ').toLowerCase();
    spkcode = spkcode.replace(/[.]/g, "");
    spkcode = spkcode.replace(/\s/g, '_');

    spkcode = sermonbasepath + spkcode + "/";
    return spkcode;
}

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
    speakerarray = name.split('_');
    for (index = 0; index < speakerarray.length; index++) {
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