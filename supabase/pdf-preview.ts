import { PdfService } from './functions/_shared/pdf.ts';
import { inputSchema } from './functions/_shared/validation.ts';
const data=inputSchema.parse({documentType:'DNI',documentNumber:'01234567',name:'Cliente de prueba',department:'Arequipa',mobile:'999123456',brand:'Toyota',model:'Corolla Cross',year:2026,quantity:1,fuel:'Gasolina',transmission:'Automática',budget:25000,purchaseDate:'2026-12-01',payment:'Transferencia bancaria',alternatives:false,usage:'Personal',declaration:true});
const start=performance.now();
const bytes=await new PdfService().generate({id:crypto.randomUUID(),code:'TMB-000001',status:'Pendiente a revisar',createdAt:new Date().toISOString(),data});
await Deno.writeFile('tmp/pdfs/fri-edge.pdf',bytes);
console.log('PDF Edge generado:',bytes.length,'bytes,',Math.round(performance.now()-start),'ms');
