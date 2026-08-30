const port = 4000;
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { error, log } = require('console');
const { type } = require('os');


app.use(express.json());
app.use(cors());

// Database connection with mongodb
mongoose.connect('mongodb+srv://akshathadithya1567:Akshith%401567@cluster0.ylli9hz.mongodb.net/ecommerce?retryWrites=true&w=majority')
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  });

//API creation
app.get("/", (req,res)=> {
    res.send("Express App is running");
})

//image storage engine
const storage = multer.diskStorage({
    destination: '../upload/images',
    filename:(req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
        }
})

const upload = multer({storage:storage})

//creating upload endpoints 
app.use('/images', express.static(path.join(__dirname, '../upload/images')));
app.post('/upload',upload.single('product'), (req,res) => {
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })
})

//Schema for creating objects
const ProductSchema  = new mongoose.Schema({
    id:{
    type:   Number,
    required: true,
    },
    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true,
    },
    data:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    },


})

const Product = mongoose.model('Product', ProductSchema);

app.post("/addproduct", async(req,res) => {
    let products = await Product.find({});
    let id;
    if(products.length > 0){
        let last_pdt_array = products.slice(-1);
        let last_pdt = last_pdt_array[0];
        id = last_pdt.id + 1;
    } else{
        id = 1;
    }
    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
        })
    console.log(product);
    await product.save();
    console.log('saved');
    res.json({
        success:1,
        name:req.body.name,
    })
})

//Creating api to delete product
app.post("/removeproduct", async(req,res) => {
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name:req.body.name,
        })
})
//Creatin api for getting all products
app.get("/allproducts", async (req, res) => {
    try {
        const products = await Product.find({});
        res.json(products); 
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//Schema creating for user Model

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
    },
    cartData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

const Users = mongoose.model('Users', UserSchema); 

//creating Endpoint for registering the user
app.post("/signup", async (req, res) =>{

    let check = await Users.findOne({email:req.body.email});
    if(check) {
        return res.status(400).json({success:false,errors:"existing user with same email address"});
    }
    let cart = {};
    for(let i = 0;i< 300;i++){
        cart[i] = 0;
    }
    const user = new Users({
        name:req.body.name,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
        });

        await user.save();
        const data = {
            user: {
                id:user.id
            }
        }

        const token = jwt.sign(data, 'secret_ecom');
            res.json({success:true,token});
})
    
// Creating endpount for login
app.post("/login", async (req, res) => {
    let user = await Users.findOne({email:req.body.email});
    if(user) {
        const passCompare = req.body.password === user.password;
        if(passCompare) {
            const data = {
                user: {
                    id:user.id
                }
            }
            const token = jwt.sign(data, 'secret_ecom');
            res.json({success:true,token});
            } else {
                return res.status(400).json({success:false,errors:"invalid password"});
            }
        }else {
            return res.status(400).json({success:false,errors:"invalid email"});
        }
    
})
    
//end point for new collection 
app.get('/newcollections' ,async (req,res) => {
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log('NewCollection fetched');
    res.send(newcollection);
})

// popular in women
app.get('/popularinwomen' ,async (req,res) => {
    let products = await Product.find({category:"women"});
    let popular_in_women = products.slice(0,4);
    console.log('popular in women fetched');
    res.send(popular_in_women);
}) 

//creating mddleware to fetch user
const fetchUser = async(req,res,next) => {
    const token = req.header('auth-token');
    if(!token) {
        res.status(401).send({errors:"Please authenticate using valid token"})
    }else {
        try {
            const data = jwt.verify(token,'secret_ecom');
            req.user = data.user;
            next();
        } catch (error) {
            res.status(401).send({errors:"Please authenticate using a valid token"})
        }
    }
}


//creating endpoint for adding products in cartdata
app.post('/addtocart',fetchUser,async(req,res) => {
    console.log("Added",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added")
})

//creating endpoint for removing products in cartdata
app.post('/removefromcart',fetchUser,async(req,res) => {
    console.log("removed",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Removed")
})

//creating endpoint to get cart data
app.get('/getcart',fetchUser,async(req,res) => {
    console.log("GetCart")
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})

app.listen(port, () => {
     console.log(`Server is running on port ${port}`);
    
})

