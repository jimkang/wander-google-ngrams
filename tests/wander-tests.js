var test = require('tape');
var WanderGoogleNgrams = require('../index');
var callNextTick = require('call-next-tick');

function createMockGetNgrams(ngramResults) {
  var ngramCallCount = 0;

  function mockGetNgrams(opts, done) {
    // console.log(opts.phrases.split(' ').length);
    // console.log(opts.phrases.split(' '));

    if (opts.phrases.split(' ').length > 5) {
      callNextTick(done);
    }
    else if (ngramCallCount < ngramResults.length) {
      var groups = [
        ngramResults[ngramCallCount].split(' ').map(word => ({word: word}))
      ];

      ngramCallCount += 1;
      callNextTick(done, null, groups);
    }
    else {
      callNextTick(done);
    }
  }

  return mockGetNgrams;
}

var testCases = [
  {
    opts: {
      word: 'the',
      direction: 'forward'
    },
    ngramResults: [
      'the same',
      'the same day',
      'the same day in',
      'the same day in which'
    ],
    expected: [
      'the',
      'same',
      'day',
      'in',
      'which'
    ]
  },
  {
    opts: {
      word: 'the',
      direction: 'forward'
    },
    ngramResults: [
      'the same',
      'the same day',
      'the same day in',
      'the same day in which',
      'the same day in which the',
    ],
    expected: [
      'the',
      'same',
      'day',
      'in',
      'which',
      'the'
    ]
  },
  {
    opts: {
      word: 'world',
      direction: 'forward'
    },
    ngramResults: [
      'world &#39;s',
    ],
    expected: [
      'world',
      '\'s',
    ]
  },
  {
    opts: {
      word: 'world',
      direction: 'forward',
      repeatLimit: 1
    },
    ngramResults: [
      'world &#39;s',
      'world &#39;s greatest',
      'world &#39;s greatest dad',
      'world &#39;s greatest dad mug',
      'world &#39;s greatest dad mug greatest',
      'world &#39;s greatest dad mug greatest dad',
      'world &#39;s greatest dad mug greatest dad mug',
      'world &#39;s greatest dad mug greatest dad mug greatest',
    ],
    expected: [
      'world',
      '\'s',
      'greatest',
      'dad',
      'mug'
    ]
  }
];

testCases.forEach(runTest);

function runTest(testCase) {
  test('Basic test', function basicTest(t) {
    t.plan(testCase.expected.length + 1);

    var createWanderStream = WanderGoogleNgrams({
      getNgrams: createMockGetNgrams(testCase.ngramResults)
    });

    var stream = createWanderStream(testCase.opts);

    stream.on('data', checkResult);
    stream.on('error', reportError);
    stream.on('end', reportDone);

    var resultsReceived = 0;

    function checkResult(word) {
      console.log('result:', word);
      t.equal(
        word,
        testCase.expected[resultsReceived],
        'Result ' + resultsReceived + ' is correct.'
      );
      resultsReceived += 1;
    }

    function reportError(error) {
      console.log(error);
      t.fail('Error during wander.');
    }

    function reportDone() {
      t.pass('Completed streaming.');
    }
  });
}
