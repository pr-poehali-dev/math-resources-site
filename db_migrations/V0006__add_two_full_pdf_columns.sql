ALTER TABLE t_p99209851_math_resources_site.products 
ADD COLUMN full_pdf_with_answers_url TEXT,
ADD COLUMN full_pdf_without_answers_url TEXT;

UPDATE t_p99209851_math_resources_site.products 
SET full_pdf_without_answers_url = full_pdf_url 
WHERE full_pdf_url IS NOT NULL;