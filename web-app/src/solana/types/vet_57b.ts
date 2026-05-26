/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/vet_57b.json`.
 */
export type Vet57b = {
  "address": "GW9yVGbyRmzwxAzNCmYHruT8FAmVLh48ibfdjniHgzx3",
  "metadata": {
    "name": "vet57b",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "payMedicalAppointment",
      "docs": [
        "Pay for a medical appointment. Supports partial and full payment.",
        "Rejects overpayment via PaymentExceedsCost error."
      ],
      "discriminator": [
        213,
        239,
        217,
        208,
        88,
        180,
        214,
        162
      ],
      "accounts": [
        {
          "name": "medicalAppointment",
          "docs": [
            "The medical appointment being paid.",
            "Verified by seeds [b\"medical-appointment\", medical_appointment.id]."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  100,
                  105,
                  99,
                  97,
                  108,
                  45,
                  97,
                  112,
                  112,
                  111,
                  105,
                  110,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "medical_appointment.id",
                "account": "medicalAppointment"
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "The transaction signer."
          ],
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "input",
          "type": {
            "defined": {
              "name": "payAppointmentInput"
            }
          }
        }
      ]
    },
    {
      "name": "registerPet",
      "docs": [
        "Register a new pet, creating an on-chain MedicalRecord PDA."
      ],
      "discriminator": [
        189,
        226,
        147,
        21,
        122,
        245,
        77,
        22
      ],
      "accounts": [
        {
          "name": "medicalRecord",
          "docs": [
            "The new medical record PDA: seeds [b\"medical-record\", input.id]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  100,
                  105,
                  99,
                  97,
                  108,
                  45,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "input.id"
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "The transaction signer and rent payer."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "The Solana system program."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "input",
          "type": {
            "defined": {
              "name": "registerPetInput"
            }
          }
        }
      ]
    },
    {
      "name": "scheduleMedicalAppointment",
      "docs": [
        "Schedule a medical appointment for a registered pet."
      ],
      "discriminator": [
        162,
        252,
        252,
        234,
        154,
        8,
        208,
        241
      ],
      "accounts": [
        {
          "name": "medicalAppointment",
          "docs": [
            "The new medical appointment PDA: seeds [b\"medical-appointment\", input.id]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  100,
                  105,
                  99,
                  97,
                  108,
                  45,
                  97,
                  112,
                  112,
                  111,
                  105,
                  110,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "input.id"
              }
            ]
          }
        },
        {
          "name": "medicalRecord",
          "docs": [
            "The existing medical record to link the appointment to.",
            "Verified by seeds [b\"medical-record\", medical_record.id]."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  100,
                  105,
                  99,
                  97,
                  108,
                  45,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "medical_record.id",
                "account": "medicalRecord"
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "The transaction signer and rent payer."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "The Solana system program."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "input",
          "type": {
            "defined": {
              "name": "scheduleAppointmentInput"
            }
          }
        }
      ]
    },
    {
      "name": "takePetToVet",
      "docs": [
        "Record a pet's arrival at the clinic with an on-chain timestamp."
      ],
      "discriminator": [
        7,
        224,
        215,
        98,
        85,
        134,
        87,
        191
      ],
      "accounts": [
        {
          "name": "petCheckin",
          "docs": [
            "The new check-in PDA: seeds [b\"pet-checkin\", medical_record.key, input.id]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  116,
                  45,
                  99,
                  104,
                  101,
                  99,
                  107,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "medicalRecord"
              },
              {
                "kind": "arg",
                "path": "input.id"
              }
            ]
          }
        },
        {
          "name": "medicalRecord",
          "docs": [
            "The existing medical record for the pet.",
            "Verified by seeds [b\"medical-record\", medical_record.id]."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  100,
                  105,
                  99,
                  97,
                  108,
                  45,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "medical_record.id",
                "account": "medicalRecord"
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "The transaction signer and rent payer."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "The Solana system program."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "input",
          "type": {
            "defined": {
              "name": "takePetToVetInput"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "medicalAppointment",
      "discriminator": [
        254,
        202,
        251,
        57,
        182,
        121,
        173,
        252
      ]
    },
    {
      "name": "medicalRecord",
      "discriminator": [
        30,
        152,
        224,
        245,
        112,
        161,
        115,
        55
      ]
    },
    {
      "name": "petCheckin",
      "discriminator": [
        214,
        40,
        87,
        239,
        7,
        196,
        142,
        151
      ]
    }
  ],
  "events": [
    {
      "name": "medicalAppointmentCreated",
      "discriminator": [
        113,
        19,
        244,
        155,
        182,
        166,
        85,
        77
      ]
    },
    {
      "name": "medicalRecordCreated",
      "discriminator": [
        192,
        135,
        45,
        207,
        65,
        130,
        206,
        125
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "paymentExceedsCost",
      "msg": "The payment amount exceeds the appointment cost"
    }
  ],
  "types": [
    {
      "name": "animalType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "dog"
          },
          {
            "name": "cat"
          }
        ]
      }
    },
    {
      "name": "medicalAppointment",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "pubkey"
          },
          {
            "name": "medicalRecord",
            "type": "pubkey"
          },
          {
            "name": "date",
            "type": "i64"
          },
          {
            "name": "time",
            "type": "string"
          },
          {
            "name": "appointmentValue",
            "type": "u64"
          },
          {
            "name": "paidValue",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "medicalAppointmentCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "pubkey"
          },
          {
            "name": "petId",
            "type": "pubkey"
          },
          {
            "name": "date",
            "type": "i64"
          },
          {
            "name": "time",
            "type": "string"
          },
          {
            "name": "appointmentValue",
            "type": "u64"
          },
          {
            "name": "paidValue",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "medicalRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "age",
            "type": "u8"
          },
          {
            "name": "animalType",
            "type": {
              "defined": {
                "name": "animalType"
              }
            }
          },
          {
            "name": "caretakerName",
            "type": "string"
          },
          {
            "name": "caretakerPhone",
            "type": "string"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "medicalRecordCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "age",
            "type": "u8"
          },
          {
            "name": "animalType",
            "type": {
              "defined": {
                "name": "animalType"
              }
            }
          },
          {
            "name": "caretakerName",
            "type": "string"
          },
          {
            "name": "caretakerPhone",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "payAppointmentInput",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "petCheckin",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "pubkey"
          },
          {
            "name": "medicalRecord",
            "type": "pubkey"
          },
          {
            "name": "checkinTime",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "registerPetInput",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "age",
            "type": "u8"
          },
          {
            "name": "animalType",
            "type": {
              "defined": {
                "name": "animalType"
              }
            }
          },
          {
            "name": "caretakerName",
            "type": "string"
          },
          {
            "name": "caretakerPhone",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "scheduleAppointmentInput",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "pubkey"
          },
          {
            "name": "date",
            "type": "i64"
          },
          {
            "name": "time",
            "type": "string"
          },
          {
            "name": "appointmentValue",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "takePetToVetInput",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
