import { Router, type Request, type Response, type NextFunction } from "express";
import { Package } from "../../models/Package.js";
import { isOPTGatewayAvailable } from "../../services/optgateway.js";
const router = Router();
router.get("/config", async (_req, res) => res.json({ country:"drc", currency:"USD", drcAvailable:isOPTGatewayAvailable(), optGatewayAvailable:isOPTGatewayAvailable(), paymentMethods:["illicocash","mobile_money","card","pepele"] }));
router.get("/packages", async (_req:Request,res:Response,next:NextFunction)=>{try{res.json(await Package.find({active:true}).sort({order:1}).lean())}catch(e){next(e)}});
export default router;
