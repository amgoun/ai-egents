-- Create function to insert chat messages in a transaction
CREATE OR REPLACE FUNCTION insert_chat_messages(
  p_session_id bigint,
  p_user_message text,
  p_ai_message text
)
RETURNS TABLE (
  id bigint,
  session_id bigint,
  content text,
  role text,
  created_at timestamptz
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_message_id bigint;
  v_ai_message_id bigint;
BEGIN
  -- Start transaction
  BEGIN
    -- Insert user message
    INSERT INTO chat_messages (session_id, content, role, created_at)
    VALUES (p_session_id, p_user_message, 'user', NOW())
    RETURNING id INTO v_user_message_id;

    -- Insert AI message
    INSERT INTO chat_messages (session_id, content, role, created_at)
    VALUES (p_session_id, p_ai_message, 'assistant', NOW())
    RETURNING id INTO v_ai_message_id;

    -- Return both messages
    RETURN QUERY
    SELECT * FROM chat_messages
    WHERE id IN (v_user_message_id, v_ai_message_id)
    ORDER BY created_at ASC;

    -- Commit transaction
    COMMIT;
  EXCEPTION WHEN OTHERS THEN
    -- Rollback on error
    ROLLBACK;
    RAISE;
  END;
END;
$$; 