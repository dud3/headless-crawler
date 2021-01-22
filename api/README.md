```
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
cd ranker/api
yarn install

# mysql
sudo apt install mysql-server 
sudo mysql_secure_installation # VALIDATE PASSWORD PLUGIN
sudo mysql
# In mysql console
> CREATE DATABASE extractor;
> exit

# Optional
# Lamp for db management
sudo apt update
sudo apt install apache2

sudo ufw app list
sudo ufw allow in "Apache"
sudo ufw status

sudo apt install php libapache2-mod-php php-mysql
sudo apt install phpmyadmin
```
