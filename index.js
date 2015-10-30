var defaultGetNgrams = require('ngram-getter');
var probable = require('probable');
var _ = require('lodash');
var callNextTick = require('call-next-tick');

function WanderGoogleNgrams(createOpts) {
  var getNgrams = defaultGetNgrams;

  if (createOpts && createOpts.getNgrams) {
    getNgrams = createOpts.getNgrams;
  }

  function wander(opts, done) {
    var word;
    var direction;
    var pickNextGroup;

    if (opts) {
      word = opts.word;
      direction = opts.direction;
      pickNextGroup = opts.pickNextGroup;
    }

    if (!pickNextGroup) {
      pickNextGroup = probable.pickFromArray;
    }

    var nextGroup;

    var initialNgramOpts = {
      phrases: word
    };
    getNextNgram(null, [[{word: word}]]);

    function getNextNgram(error, ngramsGroups) {
      if (error) {
        if (nextGroup) {
          // Return the path we've wandered so far. Most likely, we just hit 
          // too many redirects because there's no further ngrams.
          done(null, _.pluck(nextGroup, 'word'));
        }
        else {
          done(error);
        }
      }
      else if (!ngramsGroups || ngramsGroups.length < 1) {
        done(error, _.pluck(ngramsGroups, 'word'));
      }
      else {
        nextGroup = pickNextGroup(ngramsGroups);
        var phrases = _.pluck(nextGroup, 'word').join(' ');

        if (direction === 'forward') {
          phrases = phrases + ' *';
        }
        else {
          phrases = '* ' + phrases;
        }
        // console.log('phrases:', phrases);

        var ngramOpts = {
          phrases: phrases
        };
        
        callNextTick(getNgrams, ngramOpts, getNextNgram);
      }
    }
  }

  return wander;
}

module.exports = WanderGoogleNgrams;
