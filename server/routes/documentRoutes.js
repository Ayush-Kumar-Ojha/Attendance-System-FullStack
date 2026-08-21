import { Router } from "express";
import { protect, protectAdmin } from "../middleware/auth.js";
import { uploadDocument } from "../middleware/uploadDocument.js";
import { getDocuments, uploadCompanyDocument, deleteCompanyDocument } from "../controllers/documentController.js";

const documentRouter = Router();

documentRouter.get("/", protect, getDocuments);
documentRouter.post("/:type", protect, protectAdmin, uploadDocument, uploadCompanyDocument);
documentRouter.delete("/:type", protect, protectAdmin, deleteCompanyDocument);

export default documentRouter;