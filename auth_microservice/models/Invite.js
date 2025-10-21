import mongoose from "mongoose";
const inviteschema=new mongoose.Schema({
    email:{type:String,required:true},
    role:{type:String,required:true},
    inviteid:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
    invitetoken:{type:String,required:true},
tokenexpiresat: { type: Date,required:true },
    status:{
        type:String,enum:["pending","accepted","expired","revoked"],
        default:"pending"
    },
    message:{type:String},
    resendCount: { type: Number, default: 0 },                  // How many times resend occurred
  acceptedAt: { type: Date },                                // When invite was accepted
  revokedAt: { type: Date },    

    },{timestamps:true});
const Invite = mongoose.model("invite", inviteschema);
export default Invite;