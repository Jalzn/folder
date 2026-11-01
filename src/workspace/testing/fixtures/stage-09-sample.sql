PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE core_schema_migrations (module TEXT NOT NULL, version INTEGER NOT NULL, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL, PRIMARY KEY (module, version));
INSERT INTO core_schema_migrations VALUES('core',1,'core','6ddc6b562787ff35453246aec19a6ff300a92c64fc18a26c27adebead926b849','2026-11-01T11:26:33.532Z');
INSERT INTO core_schema_migrations VALUES('auth',1,'auth','b3a95286a0a898759dd22cce62cc239206f27e31fc5e9704a7c46dfe5018aac4','2026-11-01T11:26:33.533Z');
INSERT INTO core_schema_migrations VALUES('auth',2,'access_tokens','0e5229629abd8cecf4bac16d6b33af775c42f5c68f6ba54e1840d1f85f5e3489','2026-11-01T11:26:33.533Z');
INSERT INTO core_schema_migrations VALUES('workspace',1,'workspace','e16d61d89083ff715a2882427790d75f6dd62226a0e11f798ffcb7d4342eba19','2026-11-01T11:26:33.533Z');
INSERT INTO core_schema_migrations VALUES('workspace',2,'canvases','91d0e18b433d9851c15dbdf7d3f25b7ca5379c758a9596dda96288a81bf69fb0','2026-11-01T11:26:33.533Z');
INSERT INTO core_schema_migrations VALUES('workspace',3,'canvas_previews','461d1795fdbcacfc518601143cbc5c05f961a85227d5655586b15fb4775559ae','2026-11-01T11:26:33.533Z');
INSERT INTO core_schema_migrations VALUES('workspace',4,'canvas_preview_fingerprint','a5a29a6fc5456ab41b096d7ee4c857e8387582d52e57f36103625bb21c3330bd','2026-11-01T11:26:33.533Z');
INSERT INTO core_schema_migrations VALUES('workspace',5,'projects_required','c52f64c63171c8746717cb47ab27a3466b5aacbeeeb53ace0e268f62d45c5841','2026-11-01T11:26:33.534Z');
INSERT INTO core_schema_migrations VALUES('workspace',6,'folders','bbbcc64cce9068da50721651b9577443b63d97cfe0a80a9c100b1d41d072da88','2026-11-01T11:26:33.535Z');
CREATE TABLE core_mutations (
  request_id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  response TEXT NOT NULL CHECK(json_valid(response)),
  created_at TEXT NOT NULL
);
INSERT INTO core_mutations VALUES('76be692d-db50-4fed-9cd6-c23a13a14fd3','workspace.createProject','08e88899b799c89e570c8cefac34ea4e98c1cba018527ab91a7658145d885009','{"id":"d627ba72-bce6-4c47-9c44-db3ad0726c35","name":"Tinyfold","color":"violet","position":0,"version":1,"archivedAt":null,"createdAt":"2026-10-30T12:56:33.535Z","updatedAt":"2026-10-30T12:56:33.535Z"}','2026-11-01T11:26:33.538Z');
INSERT INTO core_mutations VALUES('9e2ed187-0d39-499d-9a2a-31439b884723','workspace.createProject','0cd281fec514160f9d100d43386a3822f999d35cd20b506c4391f4ca984a6aad','{"id":"c24b0a4d-4fd4-478d-a784-38f07d951002","name":"Reforma do escritório","color":"ochre","position":1,"version":1,"archivedAt":null,"createdAt":"2026-10-30T14:26:33.535Z","updatedAt":"2026-10-30T14:26:33.535Z"}','2026-11-01T11:26:33.539Z');
INSERT INTO core_mutations VALUES('baa3bffa-03fb-49f5-a20c-2fc99380ed25','workspace.createProject','c923799b10724fc5648852566c99c880c7228b7a84a60ade3475ee22a7fc0dde','{"id":"b17afafd-16bc-4f6d-81b7-a16e73db926d","name":"Geral","color":"gray","position":2,"version":1,"archivedAt":null,"createdAt":"2026-10-30T15:56:33.535Z","updatedAt":"2026-10-30T15:56:33.535Z"}','2026-11-01T11:26:33.539Z');
INSERT INTO core_mutations VALUES('07e235a7-b4b3-4196-be28-3c09296ff0ca','workspace.createProject','2c68e8f94dbabac39e5eea60bd8488d6596e2d88e43cc50195d96f7832d450b4','{"id":"7e163b89-357f-4d30-8709-0c51b4a05539","name":"Site pessoal 2024","color":"green","position":3,"version":1,"archivedAt":null,"createdAt":"2026-10-30T17:26:33.535Z","updatedAt":"2026-10-30T17:26:33.535Z"}','2026-11-01T11:26:33.539Z');
INSERT INTO core_mutations VALUES('9de5f725-f70a-44b4-b8a7-42ae4df3f99b','workspace.createFolder','a3e84937d0bc7c6b4d624d66f44e8b0cab1b3a5d57e19459b9f4a4070c6c4f12','{"id":"8b144f10-de6c-4e4c-a93d-59983903a116","version":1,"position":0}','2026-11-01T11:26:33.540Z');
INSERT INTO core_mutations VALUES('9b55d388-e7db-423e-a69b-58adbbadd6fb','workspace.createFolder','effe3e8ad498f38ec61ee807a0f31584d5783ad9a29e530c39b49ad4ee73dfcf','{"id":"feefcfee-15e7-4e1f-9a65-d6f3f7f5e12e","version":1,"position":0}','2026-11-01T11:26:33.540Z');
INSERT INTO core_mutations VALUES('88185e4f-e0b7-4885-9328-efef31b94c5b','workspace.createFolder','ea1cac52c68b2ead5640291ef6df97f5664879a42aad89b1a4d897221c3171b6','{"id":"31233273-5868-4c12-9dfc-9c0f6184f158","version":1,"position":0}','2026-11-01T11:26:33.541Z');
INSERT INTO core_mutations VALUES('89519648-4754-4ed2-a109-855927c43066','workspace.createDocument','5144065fdb402263a2d0708bd54c52245e255209311ac35161477d0f0f992d01','{"id":"26d1bbfd-6a95-467d-9755-962eecb6ee34","version":1,"updatedAt":"2026-10-30T23:26:33.535Z"}','2026-11-01T11:26:33.542Z');
INSERT INTO core_mutations VALUES('702cef20-d9bc-44b7-947b-7039c61a3fd6','workspace.createCanvas','f0e0e778157e9686a94c4398e66c1e83cc886c0c40a052a4dd36e1214d691ace','{"id":"a1ca3460-b5f0-49ea-a2d4-1e8831cdd8db","version":1,"updatedAt":"2026-10-31T00:56:33.535Z"}','2026-11-01T11:26:33.544Z');
INSERT INTO core_mutations VALUES('5f2a4847-22da-49d0-ac3d-1aa67cbfb703','workspace.createTask','cc0d002c92c52f8378a8c18f2f91bd71167044f1aa1ca6c0d790ad60f77a3b6d','{"id":"8a6a2b9a-f2d3-4014-b8c2-f986d032680c","projectId":"b17afafd-16bc-4f6d-81b7-a16e73db926d","version":1,"updatedAt":"2026-10-31T02:26:33.535Z","revision":1}','2026-11-01T11:26:33.545Z');
INSERT INTO core_mutations VALUES('817516f0-935a-4d86-81aa-d01bcbb6bbf2','workspace.createDocument','bf3563943a7bab6c383a942f61467f42db03b1dce1aa68ea75a76ec50c43a72c','{"id":"d657dca8-b868-43e4-b425-0a37afff8477","version":1,"updatedAt":"2026-10-31T03:56:33.535Z"}','2026-11-01T11:26:33.545Z');
INSERT INTO core_mutations VALUES('78afc008-64e0-4e39-af1c-868ab26f03ab','workspace.createDocument','f0a5870f3b4998918909283472c0702bae21e7696c6cf38b3ae35c899f0a2c0f','{"id":"58c26552-a8fa-4b6d-a892-515bc1b29b59","version":1,"updatedAt":"2026-10-31T05:26:33.535Z"}','2026-11-01T11:26:33.546Z');
INSERT INTO core_mutations VALUES('e5a57212-5424-4811-a4e3-377fc61a20b6','workspace.createCanvas','fc2708e184be72c76cef64d6c318451ab688e519f7aec736eee50085427a9441','{"id":"a90752df-c39f-473c-8d17-239524821c59","version":1,"updatedAt":"2026-10-31T06:56:33.535Z"}','2026-11-01T11:26:33.546Z');
INSERT INTO core_mutations VALUES('80a60ca7-0949-499c-9f25-6439b2bc872d','workspace.createTask','ac706f0604a3e432378316c1f0bdbda1d473f4068ca0e876cc1bea7de98dca8f','{"id":"6ded3d63-22e6-4dbe-a1f0-65dbba64d3ad","projectId":"c24b0a4d-4fd4-478d-a784-38f07d951002","version":1,"updatedAt":"2026-10-31T08:26:33.535Z","revision":2}','2026-11-01T11:26:33.547Z');
INSERT INTO core_mutations VALUES('66704796-c643-40fc-ac22-99d5d72a9076','workspace.createTask','59ccba4d173e6735d16fc1c592fa535c9d517d3d4a402fed990a742bf9f74e92','{"id":"15d2e201-356e-4a21-8a87-987f51937b54","projectId":"c24b0a4d-4fd4-478d-a784-38f07d951002","version":1,"updatedAt":"2026-10-31T09:56:33.535Z","revision":3}','2026-11-01T11:26:33.547Z');
INSERT INTO core_mutations VALUES('70368cf9-8fdd-4154-9316-c0257092dad1','workspace.createTask','07c4ca56e217ceab8cf52e86200f91c11ac7d8ea749485529174352660c7eefa','{"id":"16e08164-1bea-4f2c-b983-2b0b30a057b9","projectId":"c24b0a4d-4fd4-478d-a784-38f07d951002","version":1,"updatedAt":"2026-10-31T11:26:33.535Z","revision":4}','2026-11-01T11:26:33.547Z');
INSERT INTO core_mutations VALUES('46b8fbeb-9cca-4208-92b3-b8f79223a079','workspace.createTask','d09b52058ac66cd8e43269e436c5c617935b1e3a62dadaadbd13e4511cee56d1','{"id":"49369c62-3fd9-48ec-88ea-05cfd823b58d","projectId":"c24b0a4d-4fd4-478d-a784-38f07d951002","version":1,"updatedAt":"2026-10-31T12:56:33.535Z","revision":5}','2026-11-01T11:26:33.548Z');
INSERT INTO core_mutations VALUES('717d89f0-520b-4711-9f04-2bcc855891b2','workspace.createDocument','9f825bb2489887e01b2675dedfdeb19c43f518956c63fc409a50c2ab3e9a46f9','{"id":"8f83ce54-bbc6-4d89-ad62-cbd74c72fb14","version":1,"updatedAt":"2026-10-31T14:26:33.535Z"}','2026-11-01T11:26:33.548Z');
INSERT INTO core_mutations VALUES('46e78fec-a05f-4a08-b039-4da2b839acb3','workspace.createDocument','2025c6d069f226b13e92da2feb48ccf1b456eddd6eab8bb6afd0b710413ff6d7','{"id":"f7751d10-db0a-4113-bb4b-71ab1bbda28d","version":1,"updatedAt":"2026-10-31T15:56:33.535Z"}','2026-11-01T11:26:33.548Z');
INSERT INTO core_mutations VALUES('f9b91cca-a035-4402-8b4c-c8342f93b13a','workspace.createCanvas','fc062ddf6b1dac5a1877d5bb5a7971dcab998b2f52e108922e8903ffca68fa0d','{"id":"f528b3e3-9ca4-4d3a-8c62-998710b108d6","version":1,"updatedAt":"2026-10-31T17:26:33.535Z"}','2026-11-01T11:26:33.549Z');
INSERT INTO core_mutations VALUES('32a55e12-5676-4824-be98-6c8e4da7bdfb','workspace.createCanvas','5d8a941beec58eb640b00617071b8cb6b4ee5dffa6307128fd81e746b9e3d55c','{"id":"632c2fe7-323e-41c4-8ceb-f571d3f27f28","version":1,"updatedAt":"2026-10-31T18:56:33.535Z"}','2026-11-01T11:26:33.549Z');
INSERT INTO core_mutations VALUES('169553c0-16f4-4ce2-b639-e451cbb245a4','workspace.createTask','fbcb9eeb6e3edcbf8f6aae61843022cbb4e38b01d8c2d8dcd4448ee8c78e4f4b','{"id":"e40c9744-8efe-44a6-ae6c-4e4d55cd41d5","projectId":"d627ba72-bce6-4c47-9c44-db3ad0726c35","version":1,"updatedAt":"2026-10-31T20:26:33.535Z","revision":6}','2026-11-01T11:26:33.550Z');
INSERT INTO core_mutations VALUES('45457f73-5645-4b39-a1ae-74e288b08588','workspace.createTask','cfda959f08f20b375e47c23d87f3caf78b8e7a384b31fc6b4ab0cad736833870','{"id":"5129f91a-786b-477c-9bbf-531d4e504111","projectId":"d627ba72-bce6-4c47-9c44-db3ad0726c35","version":1,"updatedAt":"2026-10-31T21:56:33.535Z","revision":7}','2026-11-01T11:26:33.550Z');
INSERT INTO core_mutations VALUES('7dd0c004-ad95-4c97-8b72-89885c072d7f','workspace.createTask','79c4eb81631678c759934ac9012acf81b9c428551dce361533bd232a8dfcad15','{"id":"e2052c9e-1780-4cdc-bc06-063a6a3be26d","projectId":"d627ba72-bce6-4c47-9c44-db3ad0726c35","version":1,"updatedAt":"2026-10-31T23:26:33.535Z","revision":8}','2026-11-01T11:26:33.551Z');
INSERT INTO core_mutations VALUES('032d6fce-eb5e-4789-9b3c-4487c790ac8c','workspace.createTask','80793123abcc503357e6403f2e680a6c90dc4d2be1dcad3a7727326a9f58f7db','{"id":"ab8d6e55-e94f-4fca-b805-cd04764475cd","projectId":"d627ba72-bce6-4c47-9c44-db3ad0726c35","version":1,"updatedAt":"2026-11-01T00:56:33.535Z","revision":9}','2026-11-01T11:26:33.551Z');
INSERT INTO core_mutations VALUES('3bf87942-ae96-4108-a562-1655018bad98','workspace.createTask','c845f630f7da90e6536048e3ffc592fb84f7bdbd52d284a87522da48359e95b2','{"id":"8a9736fa-cc56-4966-bb40-b953b5ec3823","projectId":"d627ba72-bce6-4c47-9c44-db3ad0726c35","version":1,"updatedAt":"2026-11-01T02:26:33.535Z","revision":10}','2026-11-01T11:26:33.551Z');
INSERT INTO core_mutations VALUES('6368146f-00dd-4600-a288-c790efc45e38','workspace.createTask','ced3753579d13c2a66372d13ec6dfee18e68aef2942609f78def725d44b18d14','{"id":"a8bae961-d987-4434-9e9e-2f0fdd5d6c19","projectId":"d627ba72-bce6-4c47-9c44-db3ad0726c35","version":1,"updatedAt":"2026-11-01T03:56:33.535Z","revision":11}','2026-11-01T11:26:33.552Z');
INSERT INTO core_mutations VALUES('570c7f0a-0de5-41e6-9325-757158389d1d','workspace.createTask','daf97e5e9347c5b73a2d9691bf6f032ea8cfd7f992c84e0759922211269225b4','{"id":"4c75bb82-ec97-4cc2-bd39-a28e0b6b9d13","projectId":"d627ba72-bce6-4c47-9c44-db3ad0726c35","version":1,"updatedAt":"2026-11-01T05:26:33.535Z","revision":12}','2026-11-01T11:26:33.552Z');
INSERT INTO core_mutations VALUES('61755403-c48a-4afd-9a67-2e1a07f9cc26','workspace.deleteTask','0821598ad5171963f76302a766a1e0c9decc59e4f300d6d28e21ac91b1e5ab0d','{"id":"4c75bb82-ec97-4cc2-bd39-a28e0b6b9d13","revision":13}','2026-11-01T11:26:33.552Z');
INSERT INTO core_mutations VALUES('7fa74c00-8742-4b8f-95aa-507bdef05361','workspace.createDocument','9642d173607fb7e76c385eef071d4ffbc138944494907d76e0f2a1a7bdb25747','{"id":"e5afebcf-72dc-42e6-ac29-5230c5c2be39","version":1,"updatedAt":"2026-11-01T08:26:33.535Z"}','2026-11-01T11:26:33.553Z');
INSERT INTO core_mutations VALUES('08cfe0ba-bff8-4ed5-a28b-5916be0854b8','workspace.createDocument','2f10d1ccd7b5e9a1a02333b03b396719765a7480e9e45a4f5f10f150ad034ab8','{"id":"5c077599-78f6-4daf-8e4d-e09b30b3b7b9","version":1,"updatedAt":"2026-11-01T11:26:33.554Z"}','2026-11-01T11:26:33.554Z');
INSERT INTO core_mutations VALUES('561892e2-a694-4a51-ab59-831f7ff2e2fa','workspace.updateProject','114cc168fabb370204af66490874dc7bc24fcf837472f13caf4a8cd0fd9b82c3','{"id":"7e163b89-357f-4d30-8709-0c51b4a05539","name":"Site pessoal 2024","color":"green","position":3,"version":2,"archivedAt":"2026-11-01T11:26:33.554Z","createdAt":"2026-10-30T17:26:33.535Z","updatedAt":"2026-11-01T11:26:33.554Z"}','2026-11-01T11:26:33.554Z');
CREATE TABLE auth_owner (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  installation_id TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_changed_at TEXT NOT NULL
);
CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  digest TEXT NOT NULL UNIQUE,
  device_label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE auth_access_tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  digest TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope = 'read'),
  created_at TEXT NOT NULL,
  last_used_at TEXT
);
CREATE TABLE workspace_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
, color TEXT NOT NULL DEFAULT 'gray' CHECK (color IN ('violet', 'ochre', 'gray', 'green')), position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0));
INSERT INTO workspace_projects VALUES('d627ba72-bce6-4c47-9c44-db3ad0726c35','Tinyfold',1,NULL,'2026-10-30T12:56:33.535Z','2026-10-30T12:56:33.535Z','violet',0);
INSERT INTO workspace_projects VALUES('c24b0a4d-4fd4-478d-a784-38f07d951002','Reforma do escritório',1,NULL,'2026-10-30T14:26:33.535Z','2026-10-30T14:26:33.535Z','ochre',1);
INSERT INTO workspace_projects VALUES('b17afafd-16bc-4f6d-81b7-a16e73db926d','Geral',1,NULL,'2026-10-30T15:56:33.535Z','2026-10-30T15:56:33.535Z','gray',2);
INSERT INTO workspace_projects VALUES('7e163b89-357f-4d30-8709-0c51b4a05539','Site pessoal 2024',2,'2026-11-01T11:26:33.554Z','2026-10-30T17:26:33.535Z','2026-11-01T11:26:33.554Z','green',3);
CREATE TABLE workspace_documents (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES workspace_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL CHECK (json_valid(content)),
  plain_text TEXT NOT NULL,
  search_text TEXT NOT NULL,
  format_version INTEGER NOT NULL CHECK (format_version = 1),
  version INTEGER NOT NULL CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
, pinned_at TEXT, folder_id TEXT REFERENCES workspace_folders(id));
INSERT INTO workspace_documents VALUES('26d1bbfd-6a95-467d-9755-962eecb6ee34','b17afafd-16bc-4f6d-81b7-a16e73db926d','Ideias soltas','[{"id":"0eea63fd-6aa8-4944-b328-e81c0fa4f787","type":"paragraph","content":[{"type":"text","text":"Anotar aqui o que ainda não tem projeto.","styles":{}}]},{"id":"29ceb605-7038-4671-b4c1-83f8e198411f","type":"bulletListItem","content":[{"type":"text","text":"Um diário de leituras com trechos favoritos.","styles":{}}]},{"id":"f65e8902-5f0e-4f0e-a405-a8e22770caeb","type":"bulletListItem","content":[{"type":"text","text":"Organizar as fotos da viagem por cidade.","styles":{}}]}]',unistr('Anotar aqui o que ainda não tem projeto.\u000aUm diário de leituras com trechos favoritos.\u000aOrganizar as fotos da viagem por cidade.'),unistr('ideias soltas\u000aanotar aqui o que ainda nao tem projeto.\u000aum diario de leituras com trechos favoritos.\u000aorganizar as fotos da viagem por cidade.'),1,1,'2026-10-30T23:26:33.535Z','2026-10-30T23:26:33.535Z',NULL,NULL,NULL);
INSERT INTO workspace_documents VALUES('d657dca8-b868-43e4-b425-0a37afff8477','c24b0a4d-4fd4-478d-a784-38f07d951002','Orçamento e fornecedores','[{"id":"2da1dde8-ccd4-436f-ba28-99c89f1cbf4c","type":"heading","props":{"level":2},"content":[{"type":"text","text":"Orçamento","styles":{}}]},{"id":"61bd03bf-ea6f-45e7-aeda-371f1c4a533f","type":"paragraph","content":[{"type":"text","text":"Teto de R$ 8.000 para marcenaria, pintura e iluminação.","styles":{}}]},{"id":"529ca2b8-b202-42d0-834e-bf72f7c65724","type":"heading","props":{"level":2},"content":[{"type":"text","text":"Fornecedores","styles":{}}]},{"id":"87c70bbd-2bba-4176-a1a2-cacb0d012e0f","type":"bulletListItem","content":[{"type":"text","text":"Marcenaria Silva: armário e prateleiras sob medida.","styles":{}}]},{"id":"0c9868f4-8ec1-4aa7-ac2f-86bc3b009ecb","type":"bulletListItem","content":[{"type":"text","text":"Loja de iluminação do centro: luminária de mesa e pendente.","styles":{}}]}]',unistr('Orçamento\u000aTeto de R$ 8.000 para marcenaria, pintura e iluminação.\u000aFornecedores\u000aMarcenaria Silva: armário e prateleiras sob medida.\u000aLoja de iluminação do centro: luminária de mesa e pendente.'),unistr('orcamento e fornecedores\u000aorcamento\u000ateto de r$ 8.000 para marcenaria, pintura e iluminacao.\u000afornecedores\u000amarcenaria silva: armario e prateleiras sob medida.\u000aloja de iluminacao do centro: luminaria de mesa e pendente.'),1,1,'2026-10-31T03:56:33.535Z','2026-10-31T03:56:33.535Z',NULL,NULL,'8b144f10-de6c-4e4c-a93d-59983903a116');
INSERT INTO workspace_documents VALUES('58c26552-a8fa-4b6d-a892-515bc1b29b59','c24b0a4d-4fd4-478d-a784-38f07d951002','Lista de compras','[{"id":"4b92788e-e94c-4026-b301-c19d04b821b1","type":"checkListItem","props":{"checked":true},"content":[{"type":"text","text":"Tinta acrílica fosca, 18 litros","styles":{}}]},{"id":"e19457e4-2dfb-4418-880d-061da23546de","type":"checkListItem","props":{"checked":false},"content":[{"type":"text","text":"Fita crepe e lona","styles":{}}]},{"id":"2ff5a2f6-e826-4694-8917-c7d55c8e4f8a","type":"checkListItem","props":{"checked":false},"content":[{"type":"text","text":"Luminária de mesa","styles":{}}]}]',unistr('Tinta acrílica fosca, 18 litros\u000aFita crepe e lona\u000aLuminária de mesa'),unistr('lista de compras\u000atinta acrilica fosca, 18 litros\u000afita crepe e lona\u000aluminaria de mesa'),1,1,'2026-10-31T05:26:33.535Z','2026-10-31T05:26:33.535Z',NULL,NULL,'8b144f10-de6c-4e4c-a93d-59983903a116');
INSERT INTO workspace_documents VALUES('8f83ce54-bbc6-4d89-ad62-cbd74c72fb14','d627ba72-bce6-4c47-9c44-db3ad0726c35','MCP somente leitura','[{"id":"ab4ac9bd-0746-4975-8b1f-730da3c30217","type":"paragraph","content":[{"type":"text","text":"O Claude Code consulta documentos, desenhos e tarefas por MCP, sem escrever nada.","styles":{}}]},{"id":"33a0e59e-6a67-454d-a51d-996dc34b05f3","type":"paragraph","content":[{"type":"text","text":"Gerar token pessoal no Perfil, mostrado uma única vez, com o comando pronto para copiar.","styles":{}}]},{"id":"330a3b4d-af8f-4ab2-b587-a6ab9b894b67","type":"paragraph","content":[{"type":"text","text":"Cada resposta cabe em 45.000 caracteres; documentos longos vêm em páginas.","styles":{}}]}]',unistr('O Claude Code consulta documentos, desenhos e tarefas por MCP, sem escrever nada.\u000aGerar token pessoal no Perfil, mostrado uma única vez, com o comando pronto para copiar.\u000aCada resposta cabe em 45.000 caracteres; documentos longos vêm em páginas.'),unistr('mcp somente leitura\u000ao claude code consulta documentos, desenhos e tarefas por mcp, sem escrever nada.\u000agerar token pessoal no perfil, mostrado uma unica vez, com o comando pronto para copiar.\u000acada resposta cabe em 45.000 caracteres; documentos longos vem em paginas.'),1,1,'2026-10-31T14:26:33.535Z','2026-10-31T14:26:33.535Z',NULL,NULL,'31233273-5868-4c12-9dfc-9c0f6184f158');
INSERT INTO workspace_documents VALUES('f7751d10-db0a-4113-bb4b-71ab1bbda28d','d627ba72-bce6-4c47-9c44-db3ad0726c35','Notas de arquitetura','[{"id":"17bc5ddc-6084-4b3a-8926-3c25c49011f9","type":"heading","props":{"level":2},"content":[{"type":"text","text":"Módulos","styles":{}}]},{"id":"dbc1ee8c-a52a-446e-94ab-0691a089757b","type":"paragraph","content":[{"type":"text","text":"core, auth, workspace, server e web, cada um com domínio, aplicação e infraestrutura.","styles":{}}]},{"id":"0a838f5c-e2c6-4ccf-af00-ffbdbef4b9cb","type":"heading","props":{"level":2},"content":[{"type":"text","text":"Persistência","styles":{}}]},{"id":"09c72997-181a-4feb-91f3-9ebcc6511427","type":"paragraph","content":[{"type":"text","text":"SQLite no servidor, com migrações numeradas e escritas idempotentes.","styles":{}}]}]',unistr('Módulos\u000acore, auth, workspace, server e web, cada um com domínio, aplicação e infraestrutura.\u000aPersistência\u000aSQLite no servidor, com migrações numeradas e escritas idempotentes.'),unistr('notas de arquitetura\u000amodulos\u000acore, auth, workspace, server e web, cada um com dominio, aplicacao e infraestrutura.\u000apersistencia\u000asqlite no servidor, com migracoes numeradas e escritas idempotentes.'),1,1,'2026-10-31T15:56:33.535Z','2026-10-31T15:56:33.535Z',NULL,NULL,'feefcfee-15e7-4e1f-9a65-d6f3f7f5e12e');
INSERT INTO workspace_documents VALUES('e5afebcf-72dc-42e6-ac29-5230c5c2be39','d627ba72-bce6-4c47-9c44-db3ad0726c35','Visão do produto','[{"id":"1a3f2da4-dee5-4f0a-8c3f-70b0e5f84be3","type":"heading","props":{"level":1},"content":[{"type":"text","text":"Por que existe","styles":{}}]},{"id":"c9847a9a-da01-44dd-8249-85263e078fd7","type":"paragraph","content":[{"type":"text","text":"Um espaço pessoal e minimalista para conduzir projetos, com escrita, desenho e tarefas no mesmo lugar, sem o excesso de Notion, Excalidraw e Trello.","styles":{}}]},{"id":"5096309a-1940-4367-8ee0-c6a61201ec71","type":"heading","props":{"level":2},"content":[{"type":"text","text":"Princípios","styles":{}}]},{"id":"eff5a4ad-316a-4751-b9a6-cf64f69ad949","type":"bulletListItem","content":[{"type":"text","text":"O projeto é o centro.","styles":{}}]},{"id":"8284c254-f11b-4e25-9a1b-4d91364929e6","type":"bulletListItem","content":[{"type":"text","text":"Cada ferramenta faz menos que a original.","styles":{}}]},{"id":"ef687c3a-a849-4d53-8cf1-10b36d37507c","type":"bulletListItem","content":[{"type":"text","text":"Ligações vivem nos documentos.","styles":{}}]},{"id":"f374006d-d780-4f96-a5a9-2bff2fd25110","type":"bulletListItem","content":[{"type":"text","text":"Nada se perde.","styles":{}}]},{"id":"a2583e9f-1cf2-4774-8274-fdfa48bc1e6f","type":"paragraph","content":[{"type":"text","text":"Próximo passo: gerar token pessoal no Perfil para o Claude Code ler o Tinyfold.","styles":{}}]}]',unistr('Por que existe\u000aUm espaço pessoal e minimalista para conduzir projetos, com escrita, desenho e tarefas no mesmo lugar, sem o excesso de Notion, Excalidraw e Trello.\u000aPrincípios\u000aO projeto é o centro.\u000aCada ferramenta faz menos que a original.\u000aLigações vivem nos documentos.\u000aNada se perde.\u000aPróximo passo: gerar token pessoal no Perfil para o Claude Code ler o Tinyfold.'),unistr('visao do produto\u000apor que existe\u000aum espaco pessoal e minimalista para conduzir projetos, com escrita, desenho e tarefas no mesmo lugar, sem o excesso de notion, excalidraw e trello.\u000aprincipios\u000ao projeto e o centro.\u000acada ferramenta faz menos que a original.\u000aligacoes vivem nos documentos.\u000anada se perde.\u000aproximo passo: gerar token pessoal no perfil para o claude code ler o tinyfold.'),1,1,'2026-11-01T08:26:33.535Z','2026-11-01T08:26:33.535Z',NULL,'2026-11-01T09:56:33.535Z',NULL);
INSERT INTO workspace_documents VALUES('5c077599-78f6-4daf-8e4d-e09b30b3b7b9','7e163b89-357f-4d30-8709-0c51b4a05539','Portfólio','[{"id":"0b22addc-d57c-4699-9bc0-173b11be1f72","type":"paragraph","content":[{"type":"text","text":"Projetos de 2024 e um texto curto de apresentação.","styles":{}}]}]','Projetos de 2024 e um texto curto de apresentação.',unistr('portfolio\u000aprojetos de 2024 e um texto curto de apresentacao.'),1,1,'2026-11-01T11:26:33.554Z','2026-11-01T11:26:33.554Z',NULL,NULL,NULL);
CREATE TABLE workspace_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES workspace_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'done')),
  position INTEGER NOT NULL CHECK (position >= 0),
  version INTEGER NOT NULL CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
INSERT INTO workspace_tasks VALUES('8a6a2b9a-f2d3-4014-b8c2-f986d032680c','b17afafd-16bc-4f6d-81b7-a16e73db926d','Renovar domínio','todo',0,1,'2026-10-31T02:26:33.535Z','2026-10-31T02:26:33.535Z',NULL);
INSERT INTO workspace_tasks VALUES('6ded3d63-22e6-4dbe-a1f0-65dbba64d3ad','c24b0a4d-4fd4-478d-a784-38f07d951002','Pedir orçamento do marceneiro','todo',1,1,'2026-10-31T08:26:33.535Z','2026-10-31T08:26:33.535Z',NULL);
INSERT INTO workspace_tasks VALUES('15d2e201-356e-4a21-8a87-987f51937b54','c24b0a4d-4fd4-478d-a784-38f07d951002','Escolher luminária','doing',0,1,'2026-10-31T09:56:33.535Z','2026-10-31T09:56:33.535Z',NULL);
INSERT INTO workspace_tasks VALUES('16e08164-1bea-4f2c-b983-2b0b30a057b9','c24b0a4d-4fd4-478d-a784-38f07d951002','Pintar parede','todo',2,1,'2026-10-31T11:26:33.535Z','2026-10-31T11:26:33.535Z',NULL);
INSERT INTO workspace_tasks VALUES('49369c62-3fd9-48ec-88ea-05cfd823b58d','c24b0a4d-4fd4-478d-a784-38f07d951002','Medir janela','done',0,1,'2026-10-31T12:56:33.535Z','2026-10-31T12:56:33.535Z',NULL);
INSERT INTO workspace_tasks VALUES('e40c9744-8efe-44a6-ae6c-4e4d55cd41d5','d627ba72-bce6-4c47-9c44-db3ad0726c35','Gerar token pessoal no Perfil','doing',1,1,'2026-10-31T20:26:33.535Z','2026-10-31T20:26:33.535Z',NULL);
INSERT INTO workspace_tasks VALUES('5129f91a-786b-477c-9bbf-531d4e504111','d627ba72-bce6-4c47-9c44-db3ad0726c35','Expor documentos em Markdown pelo MCP','todo',3,1,'2026-10-31T21:56:33.535Z','2026-10-31T21:56:33.535Z',NULL);
INSERT INTO workspace_tasks VALUES('e2052c9e-1780-4cdc-bc06-063a6a3be26d','d627ba72-bce6-4c47-9c44-db3ad0726c35','Renderizar desenho incorporado no documento','todo',4,1,'2026-10-31T23:26:33.535Z','2026-10-31T23:26:33.535Z',NULL);
INSERT INTO workspace_tasks VALUES('ab8d6e55-e94f-4fca-b805-cd04764475cd','d627ba72-bce6-4c47-9c44-db3ad0726c35','Colunas configuráveis no quadro','doing',2,1,'2026-11-01T00:56:33.535Z','2026-11-01T00:56:33.535Z',NULL);
INSERT INTO workspace_tasks VALUES('8a9736fa-cc56-4966-bb40-b953b5ec3823','d627ba72-bce6-4c47-9c44-db3ad0726c35','Configurar backup externo','todo',5,1,'2026-11-01T02:26:33.535Z','2026-11-01T02:26:33.535Z',NULL);
INSERT INTO workspace_tasks VALUES('a8bae961-d987-4434-9e9e-2f0fdd5d6c19','d627ba72-bce6-4c47-9c44-db3ad0726c35','Corrigir foco ao fechar diálogo','done',1,1,'2026-11-01T03:56:33.535Z','2026-11-01T03:56:33.535Z',NULL);
INSERT INTO workspace_tasks VALUES('4c75bb82-ec97-4cc2-bd39-a28e0b6b9d13','d627ba72-bce6-4c47-9c44-db3ad0726c35','Revisar textos do onboarding','todo',6,2,'2026-11-01T05:26:33.535Z','2026-11-01T06:56:33.535Z','2026-11-01T06:56:33.535Z');
CREATE TABLE workspace_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  board_revision INTEGER NOT NULL CHECK (board_revision >= 0)
);
INSERT INTO workspace_state VALUES(1,13);
CREATE TABLE workspace_canvases (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES workspace_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scene TEXT NOT NULL CHECK (json_valid(scene)),
  plain_text TEXT NOT NULL,
  search_text TEXT NOT NULL,
  format_version INTEGER NOT NULL CHECK (format_version = 1),
  version INTEGER NOT NULL CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
, pinned_at TEXT, folder_id TEXT REFERENCES workspace_folders(id));
INSERT INTO workspace_canvases VALUES('a1ca3460-b5f0-49ea-a2d4-1e8831cdd8db','b17afafd-16bc-4f6d-81b7-a16e73db926d','Rabisco de logo','{"appState":{"viewBackgroundColor":"#ffffff"},"elements":[{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"#e8ecf2","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":3},"seed":1,"version":1,"versionNonce":1,"isDeleted":false,"boundElements":[{"id":"b0-label","type":"text"},{"id":"a0","type":"arrow"}],"updated":1793532393543,"link":null,"locked":false,"id":"b0","type":"rectangle","x":40,"y":120,"width":200,"height":80},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":2,"version":1,"versionNonce":2,"isDeleted":false,"boundElements":null,"updated":1793532393543,"link":null,"locked":false,"id":"b0-label","type":"text","x":50,"y":147,"width":180,"height":25,"text":"Dobra","originalText":"Dobra","fontSize":20,"fontFamily":5,"textAlign":"center","verticalAlign":"middle","containerId":"b0","autoResize":true,"lineHeight":1.25},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"#e8ecf2","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":3},"seed":3,"version":1,"versionNonce":3,"isDeleted":false,"boundElements":[{"id":"b1-label","type":"text"},{"id":"a0","type":"arrow"},{"id":"a1","type":"arrow"}],"updated":1793532393543,"link":null,"locked":false,"id":"b1","type":"rectangle","x":340,"y":120,"width":200,"height":80},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":4,"version":1,"versionNonce":4,"isDeleted":false,"boundElements":null,"updated":1793532393543,"link":null,"locked":false,"id":"b1-label","type":"text","x":350,"y":147,"width":180,"height":25,"text":"Folha","originalText":"Folha","fontSize":20,"fontFamily":5,"textAlign":"center","verticalAlign":"middle","containerId":"b1","autoResize":true,"lineHeight":1.25},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"#e8ecf2","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":3},"seed":5,"version":1,"versionNonce":5,"isDeleted":false,"boundElements":[{"id":"b2-label","type":"text"},{"id":"a1","type":"arrow"}],"updated":1793532393543,"link":null,"locked":false,"id":"b2","type":"rectangle","x":640,"y":120,"width":200,"height":80},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":6,"version":1,"versionNonce":6,"isDeleted":false,"boundElements":null,"updated":1793532393543,"link":null,"locked":false,"id":"b2-label","type":"text","x":650,"y":147,"width":180,"height":25,"text":"Marca","originalText":"Marca","fontSize":20,"fontFamily":5,"textAlign":"center","verticalAlign":"middle","containerId":"b2","autoResize":true,"lineHeight":1.25},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":2},"seed":7,"version":1,"versionNonce":7,"isDeleted":false,"boundElements":null,"updated":1793532393543,"link":null,"locked":false,"id":"a0","type":"arrow","x":244,"y":160,"width":92,"height":0,"points":[[0,0],[92,0]],"startBinding":{"elementId":"b0","focus":0,"gap":4},"endBinding":{"elementId":"b1","focus":0,"gap":4},"startArrowhead":null,"endArrowhead":"arrow","elbowed":false},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":2},"seed":8,"version":1,"versionNonce":8,"isDeleted":false,"boundElements":null,"updated":1793532393543,"link":null,"locked":false,"id":"a1","type":"arrow","x":544,"y":160,"width":92,"height":0,"points":[[0,0],[92,0]],"startBinding":{"elementId":"b1","focus":0,"gap":4},"endBinding":{"elementId":"b2","focus":0,"gap":4},"startArrowhead":null,"endArrowhead":"arrow","elbowed":false},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":9,"version":1,"versionNonce":9,"isDeleted":false,"boundElements":null,"updated":1793532393543,"link":null,"locked":false,"id":"caption","type":"text","x":40,"y":40,"width":276,"height":25,"text":"Três ideias para o logo","originalText":"Três ideias para o logo","fontSize":20,"fontFamily":5,"textAlign":"left","verticalAlign":"top","containerId":null,"autoResize":true,"lineHeight":1.25}]}',unistr('Dobra\u000aFolha\u000aMarca\u000aTrês ideias para o logo'),unistr('rabisco de logo\u000adobra\u000afolha\u000amarca\u000atres ideias para o logo'),1,1,'2026-10-31T00:56:33.535Z','2026-10-31T00:56:33.535Z',NULL,NULL,NULL);
INSERT INTO workspace_canvases VALUES('a90752df-c39f-473c-8d17-239524821c59','c24b0a4d-4fd4-478d-a784-38f07d951002','Planta do escritório','{"appState":{"viewBackgroundColor":"#ffffff"},"elements":[{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"#e8ecf2","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":3},"seed":1,"version":1,"versionNonce":1,"isDeleted":false,"boundElements":[{"id":"b0-label","type":"text"},{"id":"a0","type":"arrow"}],"updated":1793532393546,"link":null,"locked":false,"id":"b0","type":"rectangle","x":40,"y":120,"width":200,"height":80},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":2,"version":1,"versionNonce":2,"isDeleted":false,"boundElements":null,"updated":1793532393546,"link":null,"locked":false,"id":"b0-label","type":"text","x":50,"y":147,"width":180,"height":25,"text":"Porta","originalText":"Porta","fontSize":20,"fontFamily":5,"textAlign":"center","verticalAlign":"middle","containerId":"b0","autoResize":true,"lineHeight":1.25},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"#e8ecf2","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":3},"seed":3,"version":1,"versionNonce":3,"isDeleted":false,"boundElements":[{"id":"b1-label","type":"text"},{"id":"a0","type":"arrow"},{"id":"a1","type":"arrow"}],"updated":1793532393546,"link":null,"locked":false,"id":"b1","type":"rectangle","x":340,"y":120,"width":200,"height":80},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":4,"version":1,"versionNonce":4,"isDeleted":false,"boundElements":null,"updated":1793532393546,"link":null,"locked":false,"id":"b1-label","type":"text","x":350,"y":147,"width":180,"height":25,"text":"Mesa","originalText":"Mesa","fontSize":20,"fontFamily":5,"textAlign":"center","verticalAlign":"middle","containerId":"b1","autoResize":true,"lineHeight":1.25},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"#e8ecf2","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":3},"seed":5,"version":1,"versionNonce":5,"isDeleted":false,"boundElements":[{"id":"b2-label","type":"text"},{"id":"a1","type":"arrow"}],"updated":1793532393546,"link":null,"locked":false,"id":"b2","type":"rectangle","x":640,"y":120,"width":200,"height":80},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":6,"version":1,"versionNonce":6,"isDeleted":false,"boundElements":null,"updated":1793532393546,"link":null,"locked":false,"id":"b2-label","type":"text","x":650,"y":147,"width":180,"height":25,"text":"Janela","originalText":"Janela","fontSize":20,"fontFamily":5,"textAlign":"center","verticalAlign":"middle","containerId":"b2","autoResize":true,"lineHeight":1.25},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":2},"seed":7,"version":1,"versionNonce":7,"isDeleted":false,"boundElements":null,"updated":1793532393546,"link":null,"locked":false,"id":"a0","type":"arrow","x":244,"y":160,"width":92,"height":0,"points":[[0,0],[92,0]],"startBinding":{"elementId":"b0","focus":0,"gap":4},"endBinding":{"elementId":"b1","focus":0,"gap":4},"startArrowhead":null,"endArrowhead":"arrow","elbowed":false},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":2},"seed":8,"version":1,"versionNonce":8,"isDeleted":false,"boundElements":null,"updated":1793532393546,"link":null,"locked":false,"id":"a1","type":"arrow","x":544,"y":160,"width":92,"height":0,"points":[[0,0],[92,0]],"startBinding":{"elementId":"b1","focus":0,"gap":4},"endBinding":{"elementId":"b2","focus":0,"gap":4},"startArrowhead":null,"endArrowhead":"arrow","elbowed":false},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":9,"version":1,"versionNonce":9,"isDeleted":false,"boundElements":null,"updated":1793532393546,"link":null,"locked":false,"id":"caption","type":"text","x":40,"y":40,"width":288,"height":25,"text":"Planta baixa, sem escala","originalText":"Planta baixa, sem escala","fontSize":20,"fontFamily":5,"textAlign":"left","verticalAlign":"top","containerId":null,"autoResize":true,"lineHeight":1.25}]}',unistr('Porta\u000aMesa\u000aJanela\u000aPlanta baixa, sem escala'),unistr('planta do escritorio\u000aporta\u000amesa\u000ajanela\u000aplanta baixa, sem escala'),1,1,'2026-10-31T06:56:33.535Z','2026-10-31T06:56:33.535Z',NULL,'2026-11-01T11:26:33.535Z',NULL);
INSERT INTO workspace_canvases VALUES('f528b3e3-9ca4-4d3a-8c62-998710b108d6','d627ba72-bce6-4c47-9c44-db3ad0726c35','Fluxo do autosave','{"appState":{"viewBackgroundColor":"#ffffff"},"elements":[{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"#e8ecf2","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":3},"seed":1,"version":1,"versionNonce":1,"isDeleted":false,"boundElements":[{"id":"b0-label","type":"text"},{"id":"a0","type":"arrow"}],"updated":1793532393549,"link":null,"locked":false,"id":"b0","type":"rectangle","x":40,"y":120,"width":200,"height":80},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":2,"version":1,"versionNonce":2,"isDeleted":false,"boundElements":null,"updated":1793532393549,"link":null,"locked":false,"id":"b0-label","type":"text","x":50,"y":147,"width":180,"height":25,"text":"Editor","originalText":"Editor","fontSize":20,"fontFamily":5,"textAlign":"center","verticalAlign":"middle","containerId":"b0","autoResize":true,"lineHeight":1.25},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"#e8ecf2","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":3},"seed":3,"version":1,"versionNonce":3,"isDeleted":false,"boundElements":[{"id":"b1-label","type":"text"},{"id":"a0","type":"arrow"},{"id":"a1","type":"arrow"}],"updated":1793532393549,"link":null,"locked":false,"id":"b1","type":"rectangle","x":340,"y":120,"width":200,"height":80},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":4,"version":1,"versionNonce":4,"isDeleted":false,"boundElements":null,"updated":1793532393549,"link":null,"locked":false,"id":"b1-label","type":"text","x":350,"y":147,"width":180,"height":25,"text":"Rascunho local","originalText":"Rascunho local","fontSize":20,"fontFamily":5,"textAlign":"center","verticalAlign":"middle","containerId":"b1","autoResize":true,"lineHeight":1.25},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"#e8ecf2","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":3},"seed":5,"version":1,"versionNonce":5,"isDeleted":false,"boundElements":[{"id":"b2-label","type":"text"},{"id":"a1","type":"arrow"}],"updated":1793532393549,"link":null,"locked":false,"id":"b2","type":"rectangle","x":640,"y":120,"width":200,"height":80},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":6,"version":1,"versionNonce":6,"isDeleted":false,"boundElements":null,"updated":1793532393549,"link":null,"locked":false,"id":"b2-label","type":"text","x":650,"y":147,"width":180,"height":25,"text":"Servidor","originalText":"Servidor","fontSize":20,"fontFamily":5,"textAlign":"center","verticalAlign":"middle","containerId":"b2","autoResize":true,"lineHeight":1.25},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":2},"seed":7,"version":1,"versionNonce":7,"isDeleted":false,"boundElements":null,"updated":1793532393549,"link":null,"locked":false,"id":"a0","type":"arrow","x":244,"y":160,"width":92,"height":0,"points":[[0,0],[92,0]],"startBinding":{"elementId":"b0","focus":0,"gap":4},"endBinding":{"elementId":"b1","focus":0,"gap":4},"startArrowhead":null,"endArrowhead":"arrow","elbowed":false},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":2},"seed":8,"version":1,"versionNonce":8,"isDeleted":false,"boundElements":null,"updated":1793532393549,"link":null,"locked":false,"id":"a1","type":"arrow","x":544,"y":160,"width":92,"height":0,"points":[[0,0],[92,0]],"startBinding":{"elementId":"b1","focus":0,"gap":4},"endBinding":{"elementId":"b2","focus":0,"gap":4},"startArrowhead":null,"endArrowhead":"arrow","elbowed":false},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":9,"version":1,"versionNonce":9,"isDeleted":false,"boundElements":null,"updated":1793532393549,"link":null,"locked":false,"id":"caption","type":"text","x":40,"y":40,"width":384,"height":25,"text":"Uma chamada em voo por documento","originalText":"Uma chamada em voo por documento","fontSize":20,"fontFamily":5,"textAlign":"left","verticalAlign":"top","containerId":null,"autoResize":true,"lineHeight":1.25}]}',unistr('Editor\u000aRascunho local\u000aServidor\u000aUma chamada em voo por documento'),unistr('fluxo do autosave\u000aeditor\u000arascunho local\u000aservidor\u000auma chamada em voo por documento'),1,1,'2026-10-31T17:26:33.535Z','2026-10-31T17:26:33.535Z',NULL,NULL,'feefcfee-15e7-4e1f-9a65-d6f3f7f5e12e');
INSERT INTO workspace_canvases VALUES('632c2fe7-323e-41c4-8ceb-f571d3f27f28','d627ba72-bce6-4c47-9c44-db3ad0726c35','Navegação com projeto no centro','{"appState":{"viewBackgroundColor":"#ffffff"},"elements":[{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"#e8ecf2","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":3},"seed":1,"version":1,"versionNonce":1,"isDeleted":false,"boundElements":[{"id":"b0-label","type":"text"},{"id":"a0","type":"arrow"}],"updated":1793532393549,"link":null,"locked":false,"id":"b0","type":"rectangle","x":40,"y":120,"width":200,"height":80},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":2,"version":1,"versionNonce":2,"isDeleted":false,"boundElements":null,"updated":1793532393549,"link":null,"locked":false,"id":"b0-label","type":"text","x":50,"y":147,"width":180,"height":25,"text":"Seletor","originalText":"Seletor","fontSize":20,"fontFamily":5,"textAlign":"center","verticalAlign":"middle","containerId":"b0","autoResize":true,"lineHeight":1.25},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"#e8ecf2","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":3},"seed":3,"version":1,"versionNonce":3,"isDeleted":false,"boundElements":[{"id":"b1-label","type":"text"},{"id":"a0","type":"arrow"},{"id":"a1","type":"arrow"}],"updated":1793532393549,"link":null,"locked":false,"id":"b1","type":"rectangle","x":340,"y":120,"width":200,"height":80},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":4,"version":1,"versionNonce":4,"isDeleted":false,"boundElements":null,"updated":1793532393549,"link":null,"locked":false,"id":"b1-label","type":"text","x":350,"y":147,"width":180,"height":25,"text":"Projeto","originalText":"Projeto","fontSize":20,"fontFamily":5,"textAlign":"center","verticalAlign":"middle","containerId":"b1","autoResize":true,"lineHeight":1.25},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"#e8ecf2","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":3},"seed":5,"version":1,"versionNonce":5,"isDeleted":false,"boundElements":[{"id":"b2-label","type":"text"},{"id":"a1","type":"arrow"}],"updated":1793532393549,"link":null,"locked":false,"id":"b2","type":"rectangle","x":640,"y":120,"width":200,"height":80},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":6,"version":1,"versionNonce":6,"isDeleted":false,"boundElements":null,"updated":1793532393549,"link":null,"locked":false,"id":"b2-label","type":"text","x":650,"y":147,"width":180,"height":25,"text":"Item","originalText":"Item","fontSize":20,"fontFamily":5,"textAlign":"center","verticalAlign":"middle","containerId":"b2","autoResize":true,"lineHeight":1.25},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":2},"seed":7,"version":1,"versionNonce":7,"isDeleted":false,"boundElements":null,"updated":1793532393549,"link":null,"locked":false,"id":"a0","type":"arrow","x":244,"y":160,"width":92,"height":0,"points":[[0,0],[92,0]],"startBinding":{"elementId":"b0","focus":0,"gap":4},"endBinding":{"elementId":"b1","focus":0,"gap":4},"startArrowhead":null,"endArrowhead":"arrow","elbowed":false},{"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":{"type":2},"seed":8,"version":1,"versionNonce":8,"isDeleted":false,"boundElements":null,"updated":1793532393549,"link":null,"locked":false,"id":"a1","type":"arrow","x":544,"y":160,"width":92,"height":0,"points":[[0,0],[92,0]],"startBinding":{"elementId":"b1","focus":0,"gap":4},"endBinding":{"elementId":"b2","focus":0,"gap":4},"startArrowhead":null,"endArrowhead":"arrow","elbowed":false}]}',unistr('Seletor\u000aProjeto\u000aItem'),unistr('navegacao com projeto no centro\u000aseletor\u000aprojeto\u000aitem'),1,1,'2026-10-31T18:56:33.535Z','2026-10-31T18:56:33.535Z',NULL,NULL,NULL);
CREATE TABLE workspace_canvas_previews (
  canvas_id TEXT PRIMARY KEY REFERENCES workspace_canvases(id) ON DELETE CASCADE,
  scene_version INTEGER NOT NULL CHECK (scene_version > 0),
  png BLOB NOT NULL CHECK (length(png) BETWEEN 1 AND 262144),
  width INTEGER NOT NULL CHECK (width BETWEEN 1 AND 1568),
  height INTEGER NOT NULL CHECK (height BETWEEN 1 AND 1568),
  created_at TEXT NOT NULL
, scene_fingerprint TEXT);
CREATE TABLE IF NOT EXISTS "workspace_task_sources" (
  task_id TEXT PRIMARY KEY REFERENCES workspace_tasks(id) ON DELETE CASCADE,
  document_id TEXT REFERENCES workspace_documents(id) ON DELETE SET NULL,
  document_title TEXT NOT NULL,
  block_id TEXT,
  excerpt TEXT NOT NULL
);
INSERT INTO workspace_task_sources VALUES('e40c9744-8efe-44a6-ae6c-4e4d55cd41d5','8f83ce54-bbc6-4d89-ad62-cbd74c72fb14','MCP somente leitura','33a0e59e-6a67-454d-a51d-996dc34b05f3','Gerar token pessoal no Perfil');
CREATE TABLE workspace_folders (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES workspace_projects(id),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  -- The name without case and accents, computed by the application: SQLite does not normalize.
  name_key TEXT NOT NULL CHECK (length(name_key) > 0),
  position INTEGER NOT NULL CHECK (position >= 0),
  version INTEGER NOT NULL CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
INSERT INTO workspace_folders VALUES('8b144f10-de6c-4e4c-a93d-59983903a116','c24b0a4d-4fd4-478d-a784-38f07d951002','Compras','compras',0,1,'2026-10-30T18:56:33.535Z','2026-10-30T18:56:33.535Z',NULL);
INSERT INTO workspace_folders VALUES('feefcfee-15e7-4e1f-9a65-d6f3f7f5e12e','d627ba72-bce6-4c47-9c44-db3ad0726c35','Arquitetura','arquitetura',1,1,'2026-10-30T20:26:33.535Z','2026-10-30T20:26:33.535Z',NULL);
INSERT INTO workspace_folders VALUES('31233273-5868-4c12-9dfc-9c0f6184f158','d627ba72-bce6-4c47-9c44-db3ad0726c35','MCP','mcp',0,1,'2026-10-30T21:56:33.535Z','2026-10-30T21:56:33.535Z',NULL);
CREATE TRIGGER workspace_documents_project_required_on_insert BEFORE INSERT ON workspace_documents
WHEN NEW.project_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_documents.project_id is required');
END;
CREATE TRIGGER workspace_documents_project_required_on_update BEFORE UPDATE OF project_id ON workspace_documents
WHEN NEW.project_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_documents.project_id is required');
END;
CREATE TRIGGER workspace_canvases_project_required_on_insert BEFORE INSERT ON workspace_canvases
WHEN NEW.project_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_canvases.project_id is required');
END;
CREATE TRIGGER workspace_canvases_project_required_on_update BEFORE UPDATE OF project_id ON workspace_canvases
WHEN NEW.project_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_canvases.project_id is required');
END;
CREATE TRIGGER workspace_tasks_project_required_on_insert BEFORE INSERT ON workspace_tasks
WHEN NEW.project_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_tasks.project_id is required');
END;
CREATE TRIGGER workspace_tasks_project_required_on_update BEFORE UPDATE OF project_id ON workspace_tasks
WHEN NEW.project_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_tasks.project_id is required');
END;
CREATE TRIGGER workspace_documents_folder_on_insert BEFORE INSERT ON workspace_documents
WHEN NEW.folder_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_documents.folder_id must be an active folder of its project')
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_folders
    WHERE id = NEW.folder_id AND project_id = NEW.project_id AND deleted_at IS NULL
  );
END;
CREATE TRIGGER workspace_canvases_folder_on_insert BEFORE INSERT ON workspace_canvases
WHEN NEW.folder_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_canvases.folder_id must be an active folder of its project')
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_folders
    WHERE id = NEW.folder_id AND project_id = NEW.project_id AND deleted_at IS NULL
  );
END;
CREATE TRIGGER workspace_documents_folder_on_update
BEFORE UPDATE OF folder_id, project_id, deleted_at ON workspace_documents
WHEN NEW.folder_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_documents.folder_id must be a folder of its project, active for a live item')
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_folders
    WHERE id = NEW.folder_id AND project_id = NEW.project_id AND (deleted_at IS NULL OR NEW.deleted_at IS NOT NULL)
  );
END;
CREATE TRIGGER workspace_canvases_folder_on_update
BEFORE UPDATE OF folder_id, project_id, deleted_at ON workspace_canvases
WHEN NEW.folder_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_canvases.folder_id must be a folder of its project, active for a live item')
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_folders
    WHERE id = NEW.folder_id AND project_id = NEW.project_id AND (deleted_at IS NULL OR NEW.deleted_at IS NOT NULL)
  );
END;
CREATE TRIGGER workspace_folders_project_fixed BEFORE UPDATE OF project_id ON workspace_folders
WHEN NEW.project_id IS NOT OLD.project_id
BEGIN
  SELECT RAISE(ABORT, 'workspace_folders.project_id cannot change');
END;
CREATE TRIGGER workspace_folders_empty_on_delete BEFORE UPDATE OF deleted_at ON workspace_folders
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
  AND (
    EXISTS (SELECT 1 FROM workspace_documents WHERE folder_id = NEW.id AND deleted_at IS NULL)
    OR EXISTS (SELECT 1 FROM workspace_canvases WHERE folder_id = NEW.id AND deleted_at IS NULL)
  )
BEGIN
  SELECT RAISE(ABORT, 'workspace_folders cannot be deleted with live items');
END;
CREATE INDEX core_mutations_created_at ON core_mutations(created_at);
CREATE INDEX auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX auth_access_tokens_created ON auth_access_tokens(created_at);
CREATE INDEX workspace_documents_project ON workspace_documents(project_id, deleted_at, updated_at);
CREATE INDEX workspace_tasks_board ON workspace_tasks(deleted_at, status, position);
CREATE INDEX workspace_tasks_project ON workspace_tasks(project_id);
CREATE INDEX workspace_canvases_project ON workspace_canvases(project_id, deleted_at, updated_at);
CREATE INDEX workspace_canvases_recent ON workspace_canvases(deleted_at, updated_at);
CREATE INDEX workspace_documents_pinned ON workspace_documents(project_id, pinned_at) WHERE pinned_at IS NOT NULL;
CREATE INDEX workspace_canvases_pinned ON workspace_canvases(project_id, pinned_at) WHERE pinned_at IS NOT NULL;
CREATE INDEX workspace_task_sources_document ON workspace_task_sources(document_id);
CREATE UNIQUE INDEX workspace_folders_active_name ON workspace_folders(project_id, name_key) WHERE deleted_at IS NULL;
CREATE INDEX workspace_folders_project ON workspace_folders(project_id, deleted_at, position);
CREATE INDEX workspace_documents_folder ON workspace_documents(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX workspace_canvases_folder ON workspace_canvases(folder_id) WHERE folder_id IS NOT NULL;
COMMIT;
