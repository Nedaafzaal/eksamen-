CREATE TABLE eksamenSQL.bruger (
    brugerID INT IDENTITY (1,1), --BETYDER AT VÆRDIEN ATUOMATISK STARTER VED 1 OG TÆLLER OP MED 1 FOR HVER NU RÆKKE
    porteføljeID INT,
    brugernavn VARCHAR(256),
    adgangskode VARCHAR(256),
    email VARCHAR(256),
    fødselsdato DATE,
    telefonnummer INT,
    CONSTRAINT PK_brugerID PRIMARY KEY (brugerID),
    CONSTRAINT FK_porteføljeID FOREIGN KEY (porteføljeID)
        REFERENCES eksamenSQL.bruger(brugerID)
);

CREATE TABLE eksamenSQL.konto (
    kontoID INT IDENTITY (1,1),
    brugerID INT,
    kontonavn VARCHAR(256),
    saldo DECIMAL,
    valuta VARCHAR,
    oprettelsesdato DATE,
    bankreference VARCHAR(256),
    CONSTRAINT PK_kontoID PRIMARY KEY (kontoID),
    CONSTRAINT FK_brugerID FOREIGN key (brugerID)
        REFERENCES eksamenSQL.konto(kontoID)
);

CREATE TABLE eksamenSQL.transaktioner (
    transaktionID INT IDENTITY (1,1),
    sælgerKontoID INT,
    modtagerKontoId INT,
    værditype VARCHAR(256),
    dato DATE,
    tidspunkt TIME,
    transaktionstype VARCHAR(256),
    pris DECIMAL,
    gebyr DECIMAL,
    CONSTRAINT PK_transaktionID PRIMARY KEY (transaktionID),

    CONSTRAINT FK_sælgerKontoID FOREIGN KEY (sælgerKontoID)
        REFERENCES eksamenSQL.konto(kontoID),

    CONSTRAINT FK_modtagerKontoID FOREIGN KEY (modtagerKontoID)
        REFERENCES eksamenSQL.konto(kontoID)
);

CREATE TABLE eksamenSQL.værdipapir (
    værdipapirID INT IDENTITY (1,1), 
    transaktionID INT,
    navn VARCHAR(256),
    GAK DECIMAL,
    forventetVærdi DECIMAL,
    urealiseretPorteføljeGevinstTab DECIMAL,
    CONSTRAINT PK_værdipapirID PRIMARY KEY (værdipapirID),

    CONSTRAINT FK_transaktionId FOREIGN KEY (transaktionID)
        REFERENCES eksamenSQL.transaktioner(transaktionID),
);

CREATE TABLE eksamenSQL.porteføljeVærdipapir (
    porteføljeVærdipapirID INT IDENTITY (1,1),
    porteføljeID2 INT,
    værdipapirID INT,
    CONSTRAINT PK_porteføljeVærdipapirID PRIMARY KEY (porteføljeVærdipapirID),

    CONSTRAINT FK_porteføljeID2 FOREIGN KEY (porteføljeID2)
        REFERENCES eksamenSQL.porteføljer(porteføljeID),

    CONSTRAINT FK_værdipapirID2 FOREIGN KEY (værdipapirID)
        REFERENCES eksamenSQL.værdipapir(værdipapirID)
);

CREATE TABLE eksamenSQL.porteføljer (
    porteføljeID INT IDENTITY (1,1),
    værdipapirID INT,
    navn VARCHAR(256),
    kontotilknytning INT,
    dato DATE,
    forventetVærdi DECIMAL,
    værdipapirNavn VARCHAR(256),
    CONSTRAINT PK_porteføljeID PRIMARY KEY (porteføljeID),
    CONSTRAINT FK_værdipapirID FOREIGN KEY (værdipapirID)
        REFERENCES eksamenSQL.værdipapir(værdipapirID)
);