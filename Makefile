pushall:
	git push origin master && npm publish

test:
	node tests/wander-tests.js
