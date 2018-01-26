const	express = 	require('express'),
	app =		express(),
	bodyParser = 	require('body-parser'),
	port = 		process.env.PORT || 8080,
	slack = 	require('./slack.js');
const content_title, content_msg, content_button_msg, content_button_url, content_button_fallback;

app.use(bodyParser.json());

app.post('/', function(req, res){
	// Create content, depending on incoming source: GitHub, Jira
	if (req.get('X-GitHub-Event')) {
		switch (req.get('X-GitHub-Event')) {
			case 'push':
			case 'fork':
			case 'watch':
				content_title = '*<' + req.body.sender.url + '|' + req.body.sender.login + '>* requests your Code Review for Pull Request <' + req.body.repository.url + '|' + req.body.repository.name + '>';
				content_button_msg = 'View Pull Request';
				break;
		}
	}
	// Send message
	slack.sendMessage({
		'text': content_title,
		'attachments': [
			{
				'text': '',
				'fallback': 'You are unable to choose an action',
				'callback_id': 'wopr_game',
				'color': '#ffffff',
				'attachment_type': 'default',
				'actions': [
					{
						'name': 'github',
						'text': content_button_msg,
						'style': 'primary',
						'type': 'button',
						'value': 'pull_request'
					}
				]
			}
		]


	});
	res.sendStatus(200);
});

app.get('/', function(req, res){
	res.send('hello!');
});

app.listen(port, function() {
    console.log('running on http://localhost:' + port);
});
