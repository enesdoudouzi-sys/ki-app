# SAP EWM Grundlagen

SAP Extended Warehouse Management (EWM) ist die Lagerverwaltung von SAP für komplexe Lager mit Plätzen, Prozessen und mobilen Geräten.

## Lagerstruktur

Ein Lager wird über die Lagernummer abgebildet. Es gliedert sich in Lagertypen, zum Beispiel Wareneingang, Hochregal oder Versand, und darin in Lagerplätze. Jede Position im Lager hat einen eindeutigen Lagerplatz.

## Handling Unit

Eine Handling Unit (HU) ist eine physische Einheit wie Palette oder Karton mit eigener Nummer. Sie fasst Material zusammen und lässt sich als Ganzes bewegen und verfolgen.

## Lageraufgabe und Lagerauftrag

Eine Lageraufgabe (Warehouse Task) ist die kleinste Bewegung im Lager, zum Beispiel eine Palette von einem Platz zum anderen zu bringen. Mehrere Lageraufgaben werden in einem Lagerauftrag (Warehouse Order) gebündelt, den ein Mitarbeiter abarbeitet.

## Wareneingang

Beim Wareneingang wird zur Anlieferung eine Eingangslieferung angelegt. Die Ware wird entladen, gebucht und durch die Einlagerung (Putaway) auf ihren Lagerplatz gebracht.
