wander-google-ngrams
==================

Given a word, will use it to wander on a random path through the Google Ngram Viewer. It takes a word and finds 2-grams for it. Then, it picks a word from those 2-grams at random, and tries to find 3-grams containing the word and the newly picked word. It keeps repeating this process until it cannnot find an n-gram.

Note: Not officially supported by Google. Best not to count on this for anything important, and especially to not use it too frequently.

Installation
------------

    npm install wander-google-ngrams

Usage
-----

    var WanderGoogleNgrams = require('wander-google-ngrams');

    var wander = WanderGoogleNgrams();
    var opts = {
      word: 'cat',
      direction: 'backward'
    };
    wander(opts, done);

    function done(error, path) {
      if (error) {
        console.log(error);
      }
      else {
        console.log(path);
      }
    }

Output:
    
    [ 'The', 'eyes', 'of', 'a', 'cat' ]

If you want it to be less random, you can specify a `pickNextGroup` function in the opts that takes a list of n-gram groups and returns one of them.

You can also try running it with:

    node tools/wander.js <word> <forward|backward>

License
-------

The MIT License (MIT)

Copyright (c) 2015 Jim Kang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
