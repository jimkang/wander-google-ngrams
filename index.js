var defaultGetNgrams = require('ngram-getter');
var probable = require('probable');
var _ = require('lodash');
var callNextTick = require('call-next-tick');
var Readable = require('stream').Readable;
var WordCounter = require('./word-counter');

function WanderGoogleNgrams(createOpts) {
  var getNgrams = defaultGetNgrams;

  if (createOpts && createOpts.getNgrams) {
    getNgrams = createOpts.getNgrams;
  }

  function createWanderStream(opts) {
    var word;
    var direction;
    var pickNextGroup;
    var repeatLimit;
    var wordCounter = WordCounter();

    if (opts) {
      word = opts.word;
      direction = opts.direction;
      pickNextGroup = opts.pickNextGroup;
      repeatLimit = opts.repeatLimit;
    }

    var stream = Readable({
      objectMode: true
    });

    if (!pickNextGroup) {
      pickNextGroup = defaultPickNextGroup;
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
        var newWord = null;
        nextGroup = pickNextGroup(ngramsGroups);
        if (nextGroup) {
          newWord = getNewest(nextGroup).word;
          wordCounter.countWord(newWord);
          newWord = replaceHTMLEntities(newWord);
        }
        stream.push(newWord);
      }
    }

    function getNewestWordInGroup(group) {
      var newest = getNewest(group);
      return newest.word;
    }

    function defaultPickNextGroup(groups) {
      var filteredGroups = groups;

      if (!isNaN(repeatLimit)) {
        filteredGroups = groups.filter(newestWordOfGroupIsNotAtLimit);
      }
      return probable.pickFromArray(filteredGroups);
    }

    function newestWordOfGroupIsNotAtLimit(group) {
      var newestWord = getNewestWordInGroup(group);
      return wordCounter.getCountForWord(newestWord) < repeatLimit;
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
