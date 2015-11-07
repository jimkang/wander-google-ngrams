// Practically a programming interview problem, here!

function WordCounter() {
  var countsForWords = {};

  function countWord(word) {
    var count = 1;
    if (word in countsForWords) {
      count += countsForWords[word];
    }
    countsForWords[word] = count;
  }

  function getCountForWord(word) {
    return countsForWords[word] || 0;
  }

  return {
    countWord: countWord,
    getCountForWord: getCountForWord
  };
}

module.exports = WordCounter;
