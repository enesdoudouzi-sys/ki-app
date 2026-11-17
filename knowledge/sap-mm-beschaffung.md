# SAP MM Beschaffungsprozess

Das Modul SAP MM (Materials Management) bildet die Beschaffung vom Bedarf bis zur Rechnung ab.

## Ablauf

Auf eine Bestellanforderung (BANF) folgt die Bestellung beim Lieferanten. Danach kommen Wareneingang und Rechnungsprüfung. Jeder Schritt erzeugt einen Beleg.

## Wichtige Transaktionen

Eine Bestellung wird mit der Transaktion ME21N angelegt. Den Wareneingang zur Bestellung bucht man mit MIGO, mit der Bewegungsart 101. Die Rechnung des Lieferanten wird mit MIRO geprüft und gebucht.

## Dreifacher Abgleich

Beim dreifachen Abgleich (Three-Way-Match) werden Bestellung, Wareneingang und Lieferantenrechnung verglichen. Stimmen Mengen und Preise überein, wird die Rechnung zur Zahlung freigegeben. Abweichungen führen zu einer Sperre.
