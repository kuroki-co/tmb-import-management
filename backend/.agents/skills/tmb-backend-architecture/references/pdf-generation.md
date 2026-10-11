# PDFs

- Usar PDFKit para documentos programáticos. Separar datos del documento, generación y mecanismo de entrega.
- Generar desde datos validados y controlar texto largo, saltos de página, fuentes, imágenes y caracteres del idioma.
- Evitar acumular documentos grandes en memoria; usar streams o archivos temporales cuando corresponda y gestionar su limpieza.
- Definir almacenamiento, descarga y permisos según el flujo real. No exponer PDFs privados por URLs públicas predecibles.
- Verificar visualmente PDFs representativos, incluyendo datos extensos y páginas múltiples.
- Para el FRI, registrar generación y entrega con estados independientes. Generar un PDF no demuestra que el cliente lo recibió o abrió.
- Evaluar otra herramienta si las necesidades de maquetación HTML lo justifican; no introducir un navegador de generación por defecto.
