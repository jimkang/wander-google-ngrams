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

    var specifier;
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
      sentenceGuide = SentenceGuide({
        wordnikAPIKey: createOpts.wordnikAPIKey,
        direction: opts.direction,
        forwardStages: opts.forwardStages,
        backwardStages: opts.backwardStages
      });
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
        var phrases = getPhrasesForNgramSearch(_.pluck(nextGroup, 'word'));
        if (phrases) {
          getNgrams(
            {
              phrases: phrases
            },
            evaluateResult
          );
        }
        else {
          stream.push(null);
        }
      }
    };

    function evaluateResult(error, ngramsGroups) {
      if (!error && ngramsGroups && ngramsGroups.length > 0) {
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
      else if (nextGroup) {
        // Most likely, if we have a nextGroup and have an error, we hit too 
        // many redirects because there's no further ngrams. Pass things on to
        // decideNextStep rather than erroring and quitting.
        decideNextStep();
      }
      else {
        if (error) {
          stream.emit('error', error);
        }
        // End the stream.
        stream.push(null);
      }

      function decideNextStep() {
        if (cleanedWord) {
          consecutiveDeadEndRetries = 0;
          pushWordToStream(cleanedWord);
        }
        else if (specifier !== '*' && mostRecentWords) {
          // console.log('Going less specific.');
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
          // console.log('consecutiveDeadEndRetries', consecutiveDeadEndRetries);
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

    function getPhrasesForNgramSearch(words, nextSpecifier) {
      var phrases;

      if (nextSpecifier) {
        specifier = nextSpecifier;
      }
      else if (shootForASentence) {
        specifier = sentenceGuide.getNextWordSpecifier();
      }
      else {
        specifier = '*';
      }

      if (specifier !== 'END') {
        if (direction === 'forward') {
          phrases = words.slice(-4).join(' ') + ' ' + specifier;
        }
        else {
          phrases = specifier + ' ' + words.slice(0, 4).join(' ');
        }
      }

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
