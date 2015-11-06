var test = require('tape');
var WanderGoogleNgrams = require('../index');
var callNextTick = require('call-next-tick');

function mockPickNextGroup(groups) {
  return groups[groups.length - 1];
}

function createMockGetNgrams(ngramResults) {
  var ngramCallCount = 0;

  function mockGetNgrams(opts, done) {
    if (ngramCallCount < ngramResults.length) {
      var groups = ngramResults[ngramCallCount].map(word => [{word: word}]);

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
      direction: 'forward',
      pickNextGroup: mockPickNextGroup
    },
    ngramResults: [
      ['the', 'same'],
      ['the', 'same', 'day'],
      ['the', 'same', 'day', 'in'],
      ['the', 'same', 'day', 'in', 'which']
    ],
    expected: [
      'the',
      'same',
      'day',
      'in',
      'which'
    ]
  },
  // {
  //   opts: {
  //   },
  //   expected: {
  //   }
  // }
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
