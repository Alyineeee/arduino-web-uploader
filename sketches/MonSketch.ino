void setup() {
  pinMode(13, OUTPUT); // LED intégrée
  Serial.begin(9600);
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("LED allumée");
  delay(1000);
  
  digitalWrite(13, LOW);
  Serial.println("LED éteinte");
  delay(1000);
}
