// if any command get received
self.on('message', function(commandMessage) {

  var i,
      url,
      urlOrigin,
      urlType,
      status,
      line,
      container,
      resourceInfos,
      infoSpan,
      infoSpanText,
      noResults,
      linkDiv,
      urlSpan,
      urlDiv,
      urlDivText,
      statusSpan,
      statusSpanText,
      moreInfoSpan,
      moreInfoSpanText,
      toggleElem,
      detailDiv,
      detailParagraph,
      detailParagraphBreak,
      detailDivText,
      detailDivTextSpan;

  // process command messages

  if (commandMessage.command === 'clear-panel') {

    container = document.getElementById('results');

    while (container.firstChild) {

      container.removeChild(container.firstChild);

    }

    //create a noResultMessage

    infoSpan = document.createElement('span');
    infoSpan.className = 'noResultMessage';

      infoSpanText = document.createTextNode('there are no broken images...');

    infoSpan.appendChild(infoSpanText);

    container.appendChild(infoSpan);


  } else if (commandMessage.command === 'add-resource-info') {

    container = document.getElementById('results');

    // remove noResultMessage if it exists

    noResults = document.getElementsByClassName('noResultMessage');

    for (i = 0; i < noResults.length; i += 1) {

      container.removeChild(noResults[i]);

    }

    resourceInfos = commandMessage.data;

    url = resourceInfos[0];
    urlOrigin = resourceInfos[1];
    urlType = resourceInfos[2];
    status = resourceInfos[3];
    line = resourceInfos[4];

    // create HTML frame

    linkDiv = document.createElement('div');
    linkDiv.className = 'resultElement';

    // url info container

    urlSpan = document.createElement('span');
    urlSpan.className = 'url';

    // this even works when lastIndexOf('/') === -1
    urlSpanText = document.createTextNode(url.substring(url.lastIndexOf('/') + 1, url.length));

    urlSpan.appendChild(urlSpanText);

    // status info container

    statusSpan = document.createElement('span');
    statusSpan.className = 'status error-' + status;

    statusSpanText = document.createTextNode(status);

    statusSpan.appendChild(statusSpanText);

    // more link container

    moreLinkSpan = document.createElement('span');
    moreLinkSpan.className = 'moreinfo';

    moreLinkSpanText = document.createTextNode('more');

    moreLinkSpan.appendChild(moreLinkSpanText);

    // toggle details
    moreLinkSpan.onclick = function() {

      // get the 'secondChild'
      toggleElem = this.nextSibling;

      if (toggleElem.style.display === 'none') {

        toggleElem.style.display = 'block';

      } else {

        toggleElem.style.display = 'none';

      }

    };

    detailDiv = document.createElement('div');
    detailDiv.className = 'details';
    detailDiv.style.display = 'none';

    detailParagraph = document.createElement('p');

    detailDivTextSpan = document.createElement('span');
    detailDivTextSpan.className = 'fullUrl';
    detailDivText = document.createTextNode('Full URL: ' + url);
    detailDivTextSpan.appendChild(detailDivText);
    detailParagraph.appendChild(detailDivTextSpan);

    switch(status) {

      case 204:
        sCode = "No Content";
        break;

      case 403:
        sCode = "Forbidden";
        break;

      case 404:
        sCode = "Not Found";
        break;

      case 410:
        sCode = "Gone";
        break;

      case 414:
        sCode = "Request-URL Too Long";
        break;

      default:
        sCode = status;
    }

    detailDivTextSpan = document.createElement('span');
    detailDivTextSpan.className = 'scode';
    detailDivText = document.createTextNode('Statuscode: ' + sCode);
    detailDivTextSpan.appendChild(detailDivText);
    detailParagraph.appendChild(detailDivTextSpan);

    detailDivTextSpan = document.createElement('span');
    detailDivTextSpan.className = 'source';
    detailDivText = document.createTextNode('Source: ' + urlType);
    detailDivTextSpan.appendChild(detailDivText);
    detailParagraph.appendChild(detailDivTextSpan);

    if (typeof line !== 'undefined') {

      detailDivTextSpan = document.createElement('span');
      detailDivTextSpan.className = 'line';
      detailDivText = document.createTextNode('Line: (' + line + ')');
      detailDivTextSpan.appendChild(detailDivText);
      detailParagraph.appendChild(detailDivTextSpan);

    }

    detailDivTextSpan = document.createElement('span');
    detailDivTextSpan.className = 'file';
    detailDivText = document.createTextNode('File: ' + urlOrigin);
    detailDivTextSpan.appendChild(detailDivText);
    detailParagraph.appendChild(detailDivTextSpan);

    detailDiv.appendChild(detailParagraph);

    linkDiv.appendChild(urlSpan);
    linkDiv.appendChild(statusSpan);
    linkDiv.appendChild(moreLinkSpan);
    linkDiv.appendChild(detailDiv);

    if (container) {

      container.appendChild(linkDiv);

    }

  } else if (commandMessage.command === 'add-exception-info') {

    container = document.getElementById('results');

    // remove noResultMessage if it exists

    noResults = document.getElementsByClassName('noResultMessage');

    for (i = 0; i < noResults.length; i += 1) {

      container.removeChild(noResults[i]);

    }

    exceptionInfos = commandMessage.data;

    url = exceptionInfos[0];
    description = exceptionInfos[1];

    // create HTML frame

    linkDiv = document.createElement('div');
    linkDiv.className = 'resultElement';

    urlDiv = document.createElement('div');
    urlDiv.className = 'exception';

      urlDivText = document.createTextNode(url + ' throws exception: ' + description);

    urlDiv.appendChild(urlDivText);

    linkDiv.appendChild(urlDiv);

    if (container) {

      container.appendChild(linkDiv);

    }

  } else {

    console.log("unknown command");

  }
});