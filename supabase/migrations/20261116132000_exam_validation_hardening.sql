alter function private.validate_exam_document(jsonb,boolean) rename to validate_exam_document_base;
create function private.validate_exam_document(p_doc jsonb,p_complete boolean default false) returns void language plpgsql set search_path='' as $$
declare s jsonb; q jsonb;
begin
 perform private.validate_exam_document_base(p_doc,p_complete);
 if jsonb_typeof(p_doc->'schemaVersion') is distinct from 'number' then raise exception 'exam_invalid' using errcode='PT400'; end if;
 for s in select value from jsonb_array_elements(p_doc->'sections') loop
  if length(s->>'id') not between 1 and 100 then raise exception 'exam_invalid' using errcode='PT400'; end if;
  for q in select value from jsonb_array_elements(s->'questions') loop
   if length(q->>'id') not between 1 and 100 or (q->>'kind'='short_text' and jsonb_array_length(q->'options')<>0) or (q->>'kind'<>'short_text' and jsonb_array_length(q->'accepted_answers')<>0) then raise exception 'exam_invalid' using errcode='PT400'; end if;
  end loop;
 end loop;
end $$;
revoke all on function private.validate_exam_document(jsonb,boolean),private.validate_exam_document_base(jsonb,boolean) from public,anon,authenticated;
