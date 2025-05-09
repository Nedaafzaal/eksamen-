CREATE TABLE dbo.bruger (
    brugerID INT IDENTITY (1,1), --betyder at den starter  ved 1 og og tæller autoimatisk op 
    brugernavn VARCHAR(256),
    adgangskode VARCHAR(256),
    email VARCHAR(256),
    fødselsdato DATE,
    telefonnummer INT,
    fornavn VARCHAR(256),
    efternavn VARCHAR(256),
    CONSTRAINT PK_brugerID PRIMARY KEY (brugerID)
);

CREATE TABLE dbo.konto (
    kontoID INT IDENTITY (1,1),
    brugerID INT,
    kontonavn VARCHAR(256),
    saldo DECIMAL,
    valuta VARCHAR (256),
    oprettelsesdato DATE,
    bankreference VARCHAR(256),
    aktiv BIT,
    CONSTRAINT PK_kontoID PRIMARY KEY (kontoID),
    CONSTRAINT FK_brugerID FOREIGN key (brugerID)
        REFERENCES dbo.bruger(brugerID)
);

CREATE TABLE dbo.porteføljer (
    porteføljeID INT IDENTITY (1,1),
    kontoID INT,
    navn VARCHAR(256),
    kontotilknytning INT,
    sidsteHandelsDato DATE,
    forventetVærdi DECIMAL,
    værdipapirNavn VARCHAR(256),
    oprettelsesDato DATE,
    CONSTRAINT PK_porteføljeID PRIMARY KEY (porteføljeID),
    CONSTRAINT FK_kontoID FOREIGN KEY (kontoID)
        REFERENCES dbo.konto(kontoID)
);

CREATE TABLE dbo.transaktioner (
    transaktionID INT IDENTITY (1,1),
    sælgerKontoID INT,
    modtagerKontoId INT,
    porteføljeID INT,
    værditype VARCHAR(256),
    dato DATE,
    tidspunkt TIME,
    transaktionstype VARCHAR(256),
    gebyr DECIMAL,
    antal INT, 
    tickersymbol VARCHAR(256),
    CONSTRAINT PK_transaktionID PRIMARY KEY (transaktionID),

    CONSTRAINT FK_sælgerKontoID FOREIGN KEY (sælgerKontoID)
        REFERENCES dbo.konto(kontoID),

    CONSTRAINT FK_modtagerKontoID FOREIGN KEY (modtagerKontoID)
        REFERENCES dbo.konto(kontoID),
    
    CONSTRAINT FK_porteføljeID FOREIGN KEY (porteføljeID)
        REFERENCES dbo.porteføljer(porteføljeID)
);


CREATE TABLE dbo.værdipapir (
    værdipapirID INT IDENTITY (1,1), 
    transaktionID INT,
    navn VARCHAR(256),
    GAK DECIMAL,
    forventetVærdi DECIMAL,
    urealiseretPorteføljeGevinstTab DECIMAL,
    antal INT, 
    tickersymbol VARCHAR(256), 
    pris DECIMAL, 
    type NVARCHAR(256), 
    datoKøbt DATE, 

    CONSTRAINT PK_værdipapirID PRIMARY KEY (værdipapirID),

    CONSTRAINT FK_transaktionId FOREIGN KEY (transaktionID)
        REFERENCES dbo.transaktioner(transaktionID)
);



