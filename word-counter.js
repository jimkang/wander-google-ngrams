// Practically a programming interview problem, here!

function WordCounter() {
  var countsForWords = {};
  var totalCount = 0;

  function countWord(word) {
    var count = 1;
    if (word in countsForWords) {
      count += countsForWords[word];
    }
    countsForWords[word] = count;

    totalCount += 1;
  }

  function getCountForWord(word) {
    return countsForWords[word] || 0;
  }

  function getTotalCount() {
    return totalCount;
  }

  return {
    countWord: countWord,
    getCountForWord: getCountForWord,
    getTotalCount: getTotalCount
  };
}

module.exports = WordCounter;
