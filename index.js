var defaultGetNgrams = require('ngram-getter');
var probable = require('probable');
var _ = require('lodash');
var callNextTick = require('call-next-tick');
var Readable = require('stream').Readable;

function WanderGoogleNgrams(createOpts) {
  var getNgrams = defaultGetNgrams;

  if (createOpts && createOpts.getNgrams) {
    getNgrams = createOpts.getNgrams;
  }

  function createWanderStream(opts) {
    var word;
    var direction;
    var pickNextGroup;

    if (opts) {
      word = opts.word;
      direction = opts.direction;
      pickNextGroup = opts.pickNextGroup;
    }

    var stream = Readable({
      objectMode: true
    });

    if (!pickNextGroup) {
      pickNextGroup = probable.pickFromArray;
    }

    var nextGroup = [{word: word}];
    var firstRead = true;

    var getNewest = getLast;
    if (direction === 'backward') {
      getNewest = getFirst;
    }

    stream._read = function readFromStream() {
      if (firstRead) {
        firstRead = false;
        stream.push(word);
      }
      else {
        getNgrams(getOptsForNgramSearch(nextGroup, direction), pushResult);
      }
    }

    function pushResult(error, ngramsGroups) {
      if (error || !ngramsGroups || ngramsGroups.length < 1) {
        // Most likely, if we have a nextGroup, we just hit too many 
        // redirects because there's no further ngrams. End the stream.
        stream.push(null);

        if (!nextGroup) {
          stream.emit(error);
        }
      }
      else {
        nextGroup = pickNextGroup(ngramsGroups);
        // console.log('nextGroup', nextGroup);
        stream.push(replaceHTMLEntities(getNewest(nextGroup).word));
      }
    }

    return stream;    
  }

  return createWanderStream;
}

function getFirst(ngramGroup) {
  return ngramGroup[0];
}

function getLast(ngramGroup) {
  if (ngramGroup.length > 0) {
    return ngramGroup[ngramGroup.length - 1];
  }
}

function getOptsForNgramSearch(nextGroup, direction) {
  var phrases;
  var words = _.pluck(nextGroup, 'word');

  if (direction === 'forward') {
    phrases = words.slice(0, 4).join(' ') + ' *';
  }
  else {
    phrases = '* ' + words.slice(-4).join(' ');
  }

  return {
    phrases: phrases
  };
}

function replaceHTMLEntities(word) {
  return word.replace('&#39;', '\'');
}

module.exports = WanderGoogleNgrams;
