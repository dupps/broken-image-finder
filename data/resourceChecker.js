var BIF = BIF || {};

BIF.Init = {};
BIF.Analyze = {};
BIF.Notification = {};
BIF.Helper = {};

BIF.Init = {

  // first listen to transmitted prefs, then init()

  prefs: function () {

    if (self) {

      self.port.on('prefTransmission', function (receivedPrefs) {

        BIF.Init.init(receivedPrefs);

      })

    }

  },

  init: function (receivedPrefs) {

    var regExCom,
        regExUrl,
        commented,
        foundUrl,
        urlPosition,
        strike,
        urlEnd,
        strikeFinal,
        responseText,
        source,
        sourceType,
        areaToCount,
        numberOfLines,
        ancientNumberOfLines,
        showPopup,
        ignoreComments;

    showPopup = receivedPrefs[0];
    ignoreComments = receivedPrefs[1];

    if (self) {

      // listen to starting shot

      self.port.on('getResults', function () {

        BIF.Analyze.checkAllImgURLs();

        BIF.Analyze.checkAllStylesheetURLs();

      });

      // listen to receive responseTextData

      self.port.on('gotResponseText', function (responseTextData) {

        responseText = responseTextData.responseText;
        source = responseTextData.webResource[1];
        sourceType = responseTextData.webResource[2];

        // extract image urls from stylesheet text content

        do {

          // handle commented lines

          if (ignoreComments === true) {

            // RegEx to find comments in stylesheets
            regExCom = /\/\*[^*]*\*+([^\/*][^*]*\*+)*\//g;

            // RegEx to find URLs
            regExUrl = /(url\s?\([\'\"]?)([^\"\'\)]+)([\"\']?\))/g;

            commented = responseText.match(regExCom);

            if (commented !== null) {

              // sanatise comments

              for (var i in commented) {

                responseText = responseText.replace(commented[i], commented[i].replace(regExUrl, '\/* Code has been replaced by Broken Image Finder *\/'));

              }

            }

          }

          urlPosition = responseText.indexOf('url(');

          if (urlPosition !== -1) {

            // count number of lines

            areaToCount = responseText.substring(0, urlPosition);

            numberOfLines = areaToCount.split('\n').length;

            if (ancientNumberOfLines) {

              numberOfLines += ancientNumberOfLines - 1;

            }

            strike = responseText.substring(urlPosition + 4);

            urlEnd = strike.indexOf(')');

            // normalize each URL

            strikeFinal = BIF.Analyze.normalizeURLs(strike.substring(0, urlEnd), source);

            if (typeof strikeFinal !== 'undefined') {

              // check status code of found URL

              self.port.emit('getHTTPStatusCode', [strikeFinal, source, sourceType, '', numberOfLines]);

            }

            responseText = strike.substring(urlEnd + 1);

            // count every strike seperate

            if (numberOfLines) {

              ancientNumberOfLines = numberOfLines;

            }

          }

        } while (urlPosition !== -1);

      });

      self.port.on('brokenImageFound', function (url) {

        if (showPopup === true) {

          BIF.Notification.showBrokenImageError(url);

        }

      });

    }

  }

};


BIF.Analyze = {

  checkAllImgURLs: function () {

    var allImgURLs = [],
        imgElements,
        imgSrc,
        i;

    // 1. Step: Find all image URLs

    imgElements = document.querySelectorAll('img[src]');

    for (i = 0; i < imgElements.length; i += 1) {

      imgSrc = BIF.Analyze.normalizeURLs(imgElements[i].getAttribute('src'));

      allImgURLs.push([imgSrc, 'html', 'image tag']);

    }

    // 2. Step: Iterate through all found URLs and check status codes

    for (i = 0; i < allImgURLs.length; i += 1) {

      // message is sent to main.js where request is generated

      self.port.emit('getHTTPStatusCode', allImgURLs[i]);

    }

  },

  checkAllStylesheetURLs: function () {

    var allStylesheetURLs = [],
        linkElements,
        linkHref,
        i;

    // find all stylesheets (only with src-attribute)

    linkElements = document.querySelectorAll('link[rel^="stylesheet"]');

    for (i = 0; i < linkElements.length; i += 1) {

      linkHref = BIF.Analyze.normalizeURLs(linkElements[i].getAttribute('href'), null);

      // check if path is relative

      allStylesheetURLs.push([linkHref, linkHref, 'link tag']);

    }

    // 2. Step: Iterate through all found URLs and get stylesheet content

    for (i = 0; i < allStylesheetURLs.length; i += 1) {

      // message is sent to main.js where request is generated

      self.port.emit('getResponseText', allStylesheetURLs[i]);

    }

  },

  normalizeURLs: function (url, sourceDocument) {

    // this normalization is a tricky part...

    var fullDomain,
        fullDomainWithPath,
        splittedUrl,
        backwardJumps,
        splittedSource,
        sourceLength,
        diff,
        locPath,
        exceptionDetail,
        i;

    // sanitize quotes

    if (url.indexOf('"') === 0 || url.indexOf('\'') === 0) {

      url = url.replace(/[\'\"]/g, '');

    }

    if (sourceDocument) {

      // extract domain from sourceDocument string

      fullDomain = BIF.Helper.getFullDomain(sourceDocument);

    } else {

      fullDomain = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '');

    }

    if (url.indexOf('//') === 0) {

      // protocol relative request

      return location.protocol + url;

    }

    if (url.indexOf('/') === 0) {

      // in this case add domain

      return fullDomain + url;

    }

    if (url.indexOf('http') === 0 || url.indexOf('HTTP') === 0) {

      // e.g. chip.de sometimes uses upper case

      return url;

    }

    if (url.indexOf('data:') === 0) {

      // Data-URI

      exceptionDetail = [url, 'That\'s a Data-URI.'];

      self.port.emit('gotException', exceptionDetail);

    }

    if (url.indexOf('../') === 0) {

      // do some relative backward magic

      splittedUrl = url.split('../');

      backwardJumps = splittedUrl.length;

      splittedSource = sourceDocument.split('/');

      sourceLength = splittedSource.length;

      diff = sourceLength - backwardJumps;

      if (diff > 2) {

        // e.g. http://example.org/ <- three slashes minimum!

        for (i = 0; i < backwardJumps; i += 1) {

          splittedSource.pop();

        }

        splittedSource = splittedSource.join('/');

        splittedUrl = splittedUrl[backwardJumps - 1];

        return splittedSource + '/' + splittedUrl;

      } else {

        // there are too much backward jumps for that source URL

        exceptionDetail = [url, 'Too much backward jumps.'];

        self.port.emit('gotException', exceptionDetail);

      }

    }

    // e.g. 'notavailable.png' or 'img/notavailable.png'

    if (sourceDocument) {

        fullDomainWithPath = BIF.Helper.cutURLs(sourceDocument);

        return fullDomainWithPath + url;

    } else {

        locPath = BIF.Helper.dischargeURLs(location.pathname);

        return fullDomain + locPath + url;
    }

  }

};


BIF.Notification = {

  showBrokenImageError: function (url) {

    var brokenImageUrl, infoDiv, infoDivTextSpan, infoDivText, infoDivTextBreak, body;

    infoDiv = document.getElementById('bif-broken-image-error-container');

    if (!infoDiv) {

        infoDiv = document.createElement('div');
        infoDiv.id = 'bif-broken-image-error-container';

        infoDiv.style.position = 'fixed';
        infoDiv.style.top = '30px';
        infoDiv.style.right = '30px';
        infoDiv.style.padding = '10px';

        infoDiv.style.maxWidth = '220px';
        infoDiv.style.minWidth = '80px';
        infoDiv.style.overflow = 'hidden';
        infoDiv.style.whiteSpace = 'nowrap';
        infoDiv.style.textOverflow = 'ellipsis';
        infoDiv.style.direction = 'rtl';
        infoDiv.style.textAlign = 'right';

        infoDiv.style.color = '#d8000c';
        infoDiv.style.backgroundColor = '#ffbaba';
        infoDiv.style.opacity = '0.9';

        infoDiv.style.border = '1px solid #d8000c';
        infoDiv.style.borderRadius = '6px';
        infoDiv.style.boxShadow = '0 0 20px #212121';

        infoDiv.style.fontSize = '12px';
        infoDiv.style.fontWeight = 'normal';
        infoDiv.style.fontFamily = 'Arial, sans serif';

        infoDiv.style.cursor = 'pointer';
        infoDiv.style.zIndex = '999';

    }

    brokenImageUrl = BIF.Helper.cutURLs(url);

    infoDivTextSpan = document.createElement('span');
      infoDivText = document.createTextNode(brokenImageUrl);
      infoDivTextBreak = document.createElement('br');

    infoDivTextSpan.appendChild(infoDivText);
    infoDivTextSpan.appendChild(infoDivTextBreak);

    infoDiv.appendChild(infoDivTextSpan);

    body = document.getElementsByTagName('body')[0];
    body.appendChild(infoDiv);

    // add trigger to show panel

    infoDiv.onclick = function () {

      BIF.Notification.removeBrokenImageError(0);

      self.port.emit('showPanel');

    };

    // remove notification after 6 sec.

    BIF.Notification.removeBrokenImageError(6000);

  },

  removeBrokenImageError: function (duration) {

    setTimeout(function () {

        var body, infoDiv;

        infoDiv = document.getElementById('bif-broken-image-error-container');

        if (infoDiv) {

            body = document.getElementsByTagName('body')[0];

            body.removeChild(infoDiv);

        }

    }, duration);

  }

};


BIF.Helper = {

  cutURLs: function (url) {

    var shortUrl, lastSlash;

    lastSlash = url.lastIndexOf('/');

    shortUrl = url.substring(lastSlash+1);

    return shortUrl;

  },

  dischargeURLs: function (locPath) {

    var shortPath, lastSlash;

    lastSlash = locPath.lastIndexOf('/');

    shortPath = locPath.substring(0, lastSlash+1);

    return shortPath;

  },

  getFullDomain: function (sourceDocument) {

    var offset, result, fullDomain;

    offset = sourceDocument.indexOf('/');
    offset = sourceDocument.indexOf('/', offset+1);
    result = sourceDocument.indexOf('/', offset+1);

    fullDomain = sourceDocument.substring(0, result);

    return fullDomain;

  }

};

BIF.Init.prefs();