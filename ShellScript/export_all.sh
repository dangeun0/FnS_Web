#!/bin/bash
# Oracle ADB 전체 객체 DDL 추출 스크립트

DB_USER="admin"
DB_PASS="FnsFnsdb2010!"
DB_TNS="fnsdbserver1_high"

# Wallet 경로 지정
export TNS_ADMIN=/home/ubuntu/wallet

OUTFILE="all_objects.sql"

sqlplus -s ${DB_USER}/${DB_PASS}@${DB_TNS} <<EOF
SET LONG 1000000
SET LONGCHUNKSIZE 1000000
SET PAGESIZE 0
SET LINESIZE 200
SET TRIMSPOOL ON
SET HEADING OFF
SET FEEDBACK OFF
SET ECHO OFF

SPOOL ${OUTFILE}

PROMPT ==== TABLES ====
SELECT DBMS_METADATA.GET_DDL('TABLE', table_name)
FROM user_tables
ORDER BY table_name;

PROMPT ==== VIEWS ====
SELECT DBMS_METADATA.GET_DDL('VIEW', view_name)
FROM user_views
ORDER BY view_name;

PROMPT ==== INDEXES ====
SELECT DBMS_METADATA.GET_DDL('INDEX', index_name)
FROM user_indexes
ORDER BY index_name;

PROMPT ==== SEQUENCES ====
SELECT DBMS_METADATA.GET_DDL('SEQUENCE', sequence_name)
FROM user_sequences
ORDER BY sequence_name;

PROMPT ==== TRIGGERS ====
SELECT DBMS_METADATA.GET_DDL('TRIGGER', trigger_name)
FROM user_triggers
ORDER BY trigger_name;

PROMPT ==== CONSTRAINTS ====
SELECT DBMS_METADATA.GET_DDL('CONSTRAINT', constraint_name, table_name)
FROM user_constraints
WHERE constraint_type IN ('P','R','U','C')
ORDER BY table_name;

SPOOL OFF
EXIT;
EOF

echo "✅ DDL export 완료 → ${OUTFILE}"

