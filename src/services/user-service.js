const { UserRepository } = require('../repository/index');
const { sendVerificationEmail } = require('../utils/sendmail');
const jwt=require('jsonwebtoken');
const{JWT_KEY}=require('../config/serverConfig');

class UserService {
    constructor() {
        this.userRepository = new UserRepository();
    }

    async signup(data) {
        try {
            const isExists = await this.getUserByEmail(data.email);
            if (!isExists) {
                const newUser = await this.userRepository.create(data);
                const verificationToken = newUser.genJWT();
                await sendVerificationEmail(data.email, verificationToken);
                return   { message: 'Verification link sent to your email',data:newUser};
            } else if (isExists.isVerified) {
                throw { message: 'User already exists'};
            } else {
                throw { message: 'Verification email already sent. Please verify your email.'};
            }
        } catch (error) {
            throw error;
        }
    }

    async getUserByEmail(email) {
        try {
            return await this.userRepository.findBy({ email });
        } catch (error) {
            throw error;
        }
    }

    async verifyUser(token) {
        try {
            const decoded = jwt.verify(token,JWT_KEY);
            const user = await this.userRepository.get(decoded._id);
            if (!user) throw new Error('User not found');

            if (user.isVerified) {
                throw new Error('User already verified');
            }
            user.isVerified = true;
            await user.save();
            return user;
        } catch (error) {
            if(error.message=='User already verified'){
                throw new Error('User already verified');
            }
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token has expired');
            } else {
                throw new Error('Invalid token');
            }
        }
    }


    async signin(data) {
        try {
            const user = await this.getUserByEmail(data.email);
            if (!user) {
                throw { message: "No user found" };
            }
            if (!user.comparePassword(data.password)) {
                throw { message: "Wrong password" };
            }
            if (!user.isVerified) {
                throw { message: "Email not verified,verification link sent already" };
            }
            const token = user.genJWT();
            return token;
        } catch (error) {
            throw error;
        }
    }
    async sendResetLink(email) {
              console.log("email:"+email);
        try {
            const isExists = await this.getUserByEmail(email);
                  console.log("exists:"+isExists);
            if (isExists && isExists.isVerified) {
                const flag='link'
                const token = isExists.genJWT();
                console.log("email:"+email);
                console.log("token:" + token);
                await sendVerificationEmail(email, token,flag);
                return  { message: 'Password Reset link sent to your email'};
            }
            else {
                throw { message: 'No User Exists ,Email is not registered/verified'};
            }     
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async resetPassword(token,new_password) {
        try {
            const decoded = jwt.verify(token,JWT_KEY);
            const user = await this.userRepository.get(decoded._id);
            if (!user) throw new Error('User not found');
            user.password= new_password;
            await user.save();
            return user;
        } catch (error) {
            // if(error.message=='User already verified'){
            //     throw new Error('User already verified');
            // }
            // if (error.name === 'TokenExpiredError') {
            //     throw new Error('Token has expired');
            // } else {
            //     throw new Error('Invalid token');
            // }
            throw error;
        }
    }

}

module.exports = UserService;
