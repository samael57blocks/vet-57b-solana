package listener

// Anchor discriminators are the first 8 bytes of SHA-256("event:<EventName>")
// for events, or SHA-256("account:<AccountName>") for accounts.
//
// Pre-computed values (computed offline):
//
//	event:MedicalRecordCreated       → c0872dcf4182ce7d
//	event:MedicalAppointmentCreated  → 7113f49bb6a6554d
//	account:MedicalRecord            → 1e98e0f570a17337
//	account:MedicalAppointment       → fecafb39b679adfc
//	account:PetCheckin               → d62857ef07c48e97
var (
	// eventDiscriminatorMedicalRecordCreated is the Anchor event discriminator
	// for MedicalRecordCreated events.
	eventDiscriminatorMedicalRecordCreated = [8]byte{0xc0, 0x87, 0x2d, 0xcf, 0x41, 0x82, 0xce, 0x7d}

	// eventDiscriminatorMedicalAppointmentCreated is the Anchor event discriminator
	// for MedicalAppointmentCreated events.
	eventDiscriminatorMedicalAppointmentCreated = [8]byte{0x71, 0x13, 0xf4, 0x9b, 0xb6, 0xa6, 0x55, 0x4d}

	// accountDiscriminatorMedicalRecord is the Anchor account discriminator
	// for MedicalRecord accounts.
	accountDiscriminatorMedicalRecord = [8]byte{0x1e, 0x98, 0xe0, 0xf5, 0x70, 0xa1, 0x73, 0x37}

	// accountDiscriminatorMedicalAppointment is the Anchor account discriminator
	// for MedicalAppointment accounts.
	accountDiscriminatorMedicalAppointment = [8]byte{0xfe, 0xca, 0xfb, 0x39, 0xb6, 0x79, 0xad, 0xfc}

	// accountDiscriminatorPetCheckin is the Anchor account discriminator
	// for PetCheckin accounts.
	accountDiscriminatorPetCheckin = [8]byte{0xd6, 0x28, 0x57, 0xef, 0x07, 0xc4, 0x8e, 0x97}
)
