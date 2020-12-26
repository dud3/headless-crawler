import request

urls = ['google.com', 'wikipedia.com']

requests.post('http://165.227.28.233:3001/api/v0/extracts/get', urls=urls)

print r.json();
