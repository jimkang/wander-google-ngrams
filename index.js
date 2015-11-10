var defaultGetNgrams = require('ngram-getter');
var probable = require('probable');
var _ = require('lodash');
var callNextTick = require('call-next-tick');
var Readable = require('stream').Readable;
var WordCounter = require('./word-counter');
var SentenceGuide = require('./sentence-guide');
var queue = require('queue-async');

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
    var tryReducingNgramSizeAtDeadEnds;
    var characterLimit;
    var shootForASentence;
    var maxWordCount;

    var prevSpecifier;
    var mostRecentWords;
    var consecutiveDeadEndRetries = 0;
    var maxConsecutiveDeadEndRetries = 3;

    var wordCounter = WordCounter();
    var sentenceGuide;

    if (opts) {
      word = opts.word;
      direction = opts.direction;
      pickNextGroup = opts.pickNextGroup;
      repeatLimit = opts.repeatLimit;
      tryReducingNgramSizeAtDeadEnds = opts.tryReducingNgramSizeAtDeadEnds;
      characterLimit = opts.characterLimit;
      shootForASentence = opts.shootForASentence;
      maxWordCount = opts.maxWordCount;
    }

    if (shootForASentence) {
      sentenceGuide = SentenceGuide();
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
      if (maxWordCount && wordCounter.getTotalCount() >= maxWordCount) {
        stream.push(null);
      }
      else if (firstRead) {
        firstRead = false;
        pushWordToStream(word);
      }
      else {
        getNgrams(
          {
            phrases: getPhrasesForNgramSearch(_.pluck(nextGroup, 'word'))
          },
          evaluateResult
        );
      }
    };

    function evaluateResult(error, ngramsGroups) {
      if (error || !ngramsGroups || ngramsGroups.length < 1) {
        if (!nextGroup) {
          stream.emit(error);
        }
        else {
          // Most likely, if we have a nextGroup, we just hit too many 
          // redirects because there's no further ngrams. End the stream.
          decideNextStep();
        }
      }
      else {
        var newWord = null;
        var cleanedWord;
        nextGroup = pickNextGroup(ngramsGroups);

        if (nextGroup) {
          mostRecentWords = _.pluck(nextGroup, 'word');
          newWord = getNewest(mostRecentWords);
          cleanedWord = replaceHTMLEntities(newWord);
        }

        decideNextStep();
      }

      function decideNextStep() {
        if (cleanedWord) {
          consecutiveDeadEndRetries = 0;
          pushWordToStream(cleanedWord);
        }
        else if (prevSpecifier !== '*' && mostRecentWords) {
          console.log('Going less specific.');
          // Try going less specific.
          callNextTick(
            getNgrams,
            {
              phrases: getPhrasesForNgramSearch(mostRecentWords, '*')
            },
            evaluateResult
          );
        }
        else if (tryReducingNgramSizeAtDeadEnds && mostRecentWords &&
          consecutiveDeadEndRetries < maxConsecutiveDeadEndRetries) {
          consecutiveDeadEndRetries += 1;
          console.log('consecutiveDeadEndRetries', consecutiveDeadEndRetries);
          mostRecentWords = removeOldestFromGroup(mostRecentWords);
          callNextTick(
            getNgrams,
            {
              phrases: getPhrasesForNgramSearch(mostRecentWords, '*')
            },
            evaluateResult
          );
        }
        else {
          // End stream.
          stream.push(null);
        }
      }
    }

    function pushWordToStream(word) {
      if (sentenceGuide) {
        sentenceGuide.noteWordWasPushed(word, doPush);
      }
      else {
        doPush();
      }

      function doPush() {
        wordCounter.countWord(word);
        stream.push(word);
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

    function removeOldestFromGroup(group) {
      if (direction === 'forward') {
        return group.slice(1);
      }
      else {
        return group.slice(-1);
      }
    }

    function getPhrasesForNgramSearch(words, specifier) {
      var phrases;
      // var words = _.pluck(nextGroup, 'word');
      if (specifier) {
        prevSpecifier = specifier;
      }
      else if (shootForASentence) {
        prevSpecifier = sentenceGuide.getNextWordSpecifier();
      }
      else {
        prevSpecifier = '*';
      }

      if (direction === 'forward') {
        phrases = words.slice(-4).join(' ') + ' ' + prevSpecifier;
      }
      else {
        phrases = prevSpecifier + ' ' + words.slice(0, 4).join(' ');
      }

      // console.log('WORDS:', words, 'PHRASES:', phrases);
      return phrases;
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

function replaceHTMLEntities(word) {
  return word.replace('&#39;', '\'');
}

module.exports = WanderGoogleNgrams;
