```
# Ubuntu 18+

# clone
git clone https://gitlab.com/kagi-search-engine/ranker.git
sudo apt update

# node 14
curl -sL https://deb.nodesource.com/setup_14.x | sudo bash -
sudo apt -y install nodejs
sudo apt -y install gcc g++ make

# yarn
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt update && sudo apt install yarn

# cd to repo
cd ranker/crawler

# yarn
yarn install

# Headless chrome
cd ~
apt --fix-broken install
apt-get install libnss3-dev
sudo apt-get purge chromium-browser
sudo apt-get install -y libappindicator1 fonts-liberation
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome*.deb

# Back to the crawler
cd ranker/crawler
cp env.example .env
yarn shell
```
