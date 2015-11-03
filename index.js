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
        stream.push(getNewest(nextGroup).word);
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
  var phrases = _.pluck(nextGroup, 'word').join(' ');
  if (direction === 'forward') {
    phrases = phrases + ' *';
  }
  else {
    phrases = '* ' + phrases;
  }

  return {
    phrases: phrases
  };
}

module.exports = WanderGoogleNgrams;
