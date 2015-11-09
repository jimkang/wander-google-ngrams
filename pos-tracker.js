var WordPOS = require('wordpos');
var wordpos = new WordPOS();
var callNextTick = require('call-next-tick');

var verbsThatWordPOSSomehowMisses = [
  'is',
  'was',
  'went'
];

function POSTracker() {
  // var posForWords = {};
  var observedPOS = {};

  function notePOS(word, done) {
    if (verbsThatWordPOSSomehowMisses.indexOf(word) !== -1) {
      callNextTick(done, null, {'verbs': [word]});
    }
    else {
      wordpos.getPOS(word, saveWordPOS);
    }
  
    function saveWordPOS(partsOfSpeech) {
      // posForWords[word] = partsOfSpeech;
      // console.log(word, 'pos', partsOfSpeech);

      // We only want records for words that are strictly one part of speech.
      var exclusivePOS = getExclusivePOSFromDict(partsOfSpeech);
      if (exclusivePOS) {
        observedPOS[exclusivePOS] = true;
      }
      done(null, partsOfSpeech);
    }
  }

  function getTrackedPOS() {
    return Object.keys(observedPOS);
  }

  return {
    notePOS: notePOS,
    getTrackedPOS: getTrackedPOS,
    getExclusivePOSFromDict: getExclusivePOSFromDict,
    dictContainsPOS: dictContainsPOS
  };
}

function getExclusivePOSFromDict(posDict) {
  var exclusivePOS;
  for (var pos in posDict) {
    if (posDict[pos].length > 0) {
      if (exclusivePOS) {
        exclusivePOS = undefined;
        break;
      }
      else {
        exclusivePOS = pos;
      }
    }
  }
  return exclusivePOS;
}

function dictContainsPOS(posDict, pos) {
  return (pos in posDict && posDict[pos].length > 0);
}

module.exports = POSTracker;
