This is a template to make backend servers. 
It includes dockercompose(for postgresql), Typeorm and other necessary configurations like jwt, .env, bcrypt etc.
It includes routes like signup, login, logout, etc..
It is ready to use.

how to use: 
- clone this repo : git clone https://github.com/shishir-subedii/backend-template.git

- install the necessary modules: npm install 

- run postgresql container : 
    - docker compose -d up (or you can use any postgresql environment)

- run the project(development): npm run start:dev

later use your own github repo and it's configurations.
you can remove the past commits and start fresh with your own repo. 