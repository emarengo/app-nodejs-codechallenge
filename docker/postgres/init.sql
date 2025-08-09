-- Yape Transaction Service Database Initialization
-- This script creates the database and initial data

\c yape_transactions;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create transaction_types table
CREATE TABLE IF NOT EXISTS transaction_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transaction_statuses table
CREATE TABLE IF NOT EXISTS transaction_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    "transactionExternalId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountExternalIdDebit" UUID NOT NULL,
    "accountExternalIdCredit" UUID NOT NULL,
    "tranferTypeId" INTEGER NOT NULL,
    value DECIMAL(15,2) NOT NULL,
    "transaction_status_id" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_transaction_type 
        FOREIGN KEY ("tranferTypeId") 
        REFERENCES transaction_types(id),
    
    CONSTRAINT fk_transaction_status 
        FOREIGN KEY ("transaction_status_id") 
        REFERENCES transaction_statuses(id),
        
    CONSTRAINT chk_different_accounts 
        CHECK ("accountExternalIdDebit" != "accountExternalIdCredit"),
        
    CONSTRAINT chk_positive_value 
        CHECK (value > 0)
);

-- Insert initial transaction types
INSERT INTO transaction_types (id, name, description, "isActive") VALUES 
(1, 'Transfer', 'Standard money transfer between accounts', true),
(2, 'Payment', 'Payment for goods or services', true),
(3, 'Refund', 'Refund transaction', true)
ON CONFLICT (id) DO NOTHING;

-- Insert initial transaction statuses
INSERT INTO transaction_statuses (id, name, description, "isActive") VALUES 
(1, 'pending', 'Transaction is pending anti-fraud validation', true),
(2, 'approved', 'Transaction approved by anti-fraud system', true),
(3, 'rejected', 'Transaction rejected by anti-fraud system', true)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_debit_account ON transactions("accountExternalIdDebit");
CREATE INDEX IF NOT EXISTS idx_transactions_credit_account ON transactions("accountExternalIdCredit");
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions("transaction_status_id");
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions("tranferTypeId");
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions("createdAt");
CREATE INDEX IF NOT EXISTS idx_transactions_value ON transactions(value);

-- Create trigger to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transaction_types_updated_at BEFORE UPDATE ON transaction_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_statuses_updated_at BEFORE UPDATE ON transaction_statuses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Yape Transaction Service database initialized successfully';
    RAISE NOTICE 'Created tables: transaction_types, transaction_statuses, transactions';
    RAISE NOTICE 'Created indexes for performance optimization';
    RAISE NOTICE 'Created triggers for automatic timestamp updates';
END $$; 