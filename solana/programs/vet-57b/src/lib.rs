use anchor_lang::prelude::*;

declare_id!("GW9yVGbyRmzwxAzNCmYHruT8FAmVLh48ibfdjniHgzx3");

// ---------------------------------------------------------------------------
// Constants: pre-calculated account space
// ---------------------------------------------------------------------------

/// Space for MedicalRecord: 8 discriminator + 32 id + (4+50) name + 1 age
/// + 1 animal_type + (4+50) caretaker_name + (4+20) caretaker_phone + 1 bump
const MEDICAL_RECORD_SPACE: usize = 8 + 32 + (4 + 50) + 1 + 1 + (4 + 50) + (4 + 20) + 1;

/// Space for MedicalAppointment: 8 discriminator + 32 id + 32 medical_record
/// + 8 date + (4+10) time + 8 appointment_value + 8 paid_value + 1 bump
const MEDICAL_APPOINTMENT_SPACE: usize = 8 + 32 + 32 + 8 + (4 + 10) + 8 + 8 + 1;

/// Space for PetCheckin: 8 discriminator + 32 id + 32 medical_record
/// + 8 checkin_time + 1 bump
const PET_CHECKIN_SPACE: usize = 8 + 32 + 32 + 8 + 1;

// ---------------------------------------------------------------------------
// Enum: AnimalType
// ---------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum AnimalType {
    Dog,
    Cat,
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

#[error_code]
pub enum Vet57bError {
    #[msg("A pet with this ID is already registered")]
    PetAlreadyRegistered,
    #[msg("An appointment with this ID already exists for this medical record")]
    AppointmentAlreadyExists,
    #[msg("The payment amount exceeds the appointment cost")]
    PaymentExceedsCost,
    #[msg("A check-in with this ID already exists for this medical record")]
    CheckinAlreadyExists,
    #[msg("The specified medical record was not found")]
    MedicalRecordNotFound,
}

// ---------------------------------------------------------------------------
// Account structs
// ---------------------------------------------------------------------------

#[account]
pub struct MedicalRecord {
    pub id: Pubkey,
    pub name: String,
    pub age: u8,
    pub animal_type: AnimalType,
    pub caretaker_name: String,
    pub caretaker_phone: String,
    pub bump: u8,
}

#[account]
pub struct MedicalAppointment {
    pub id: Pubkey,
    pub medical_record: Pubkey,
    pub date: i64,
    pub time: String,
    pub appointment_value: u64,
    pub paid_value: u64,
    pub bump: u8,
}

#[account]
pub struct PetCheckin {
    pub id: Pubkey,
    pub medical_record: Pubkey,
    pub checkin_time: i64,
    pub bump: u8,
}

// ---------------------------------------------------------------------------
// Input structs (instruction arguments)
// ---------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RegisterPetInput {
    pub id: Pubkey,
    pub name: String,
    pub age: u8,
    pub animal_type: AnimalType,
    pub caretaker_name: String,
    pub caretaker_phone: String,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ScheduleAppointmentInput {
    pub id: Pubkey,
    pub date: i64,
    pub time: String,
    pub appointment_value: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct PayAppointmentInput {
    pub amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct TakePetToVetInput {
    pub id: Pubkey,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[event]
pub struct MedicalRecordCreated {
    pub id: Pubkey,
    pub name: String,
    pub age: u8,
    pub animal_type: AnimalType,
    pub caretaker_name: String,
    pub caretaker_phone: String,
}

#[event]
pub struct MedicalAppointmentCreated {
    pub id: Pubkey,
    pub pet_id: Pubkey,
    pub date: i64,
    pub time: String,
    pub appointment_value: u64,
    pub paid_value: u64,
}

// ---------------------------------------------------------------------------
// Account validation structs
// ---------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(input: RegisterPetInput)]
pub struct RegisterPetAccounts<'info> {
    /// The new medical record PDA: seeds [b"medical-record", input.id]
    #[account(
        init,
        seeds = [b"medical-record", input.id.as_ref()],
        bump,
        payer = authority,
        space = MEDICAL_RECORD_SPACE,
    )]
    pub medical_record: Account<'info, MedicalRecord>,

    /// The transaction signer and rent payer.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The Solana system program.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(input: ScheduleAppointmentInput)]
pub struct ScheduleMedicalAppointmentAccounts<'info> {
    /// The new medical appointment PDA: seeds [b"medical-appointment", input.id]
    #[account(
        init,
        seeds = [b"medical-appointment", input.id.as_ref()],
        bump,
        payer = authority,
        space = MEDICAL_APPOINTMENT_SPACE,
    )]
    pub medical_appointment: Account<'info, MedicalAppointment>,

    /// The existing medical record to link the appointment to.
    /// Verified by seeds [b"medical-record", medical_record.id].
    #[account(
        seeds = [b"medical-record", medical_record.id.as_ref()],
        bump = medical_record.bump,
    )]
    pub medical_record: Account<'info, MedicalRecord>,

    /// The transaction signer and rent payer.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The Solana system program.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(input: PayAppointmentInput)]
pub struct PayMedicalAppointmentAccounts<'info> {
    /// The medical appointment being paid.
    /// Verified by seeds [b"medical-appointment", medical_appointment.id].
    #[account(
        mut,
        seeds = [b"medical-appointment", medical_appointment.id.as_ref()],
        bump = medical_appointment.bump,
    )]
    pub medical_appointment: Account<'info, MedicalAppointment>,

    /// The transaction signer.
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(input: TakePetToVetInput)]
pub struct TakePetToVetAccounts<'info> {
    /// The new check-in PDA: seeds [b"pet-checkin", medical_record.key, input.id]
    #[account(
        init,
        seeds = [b"pet-checkin", medical_record.key().as_ref(), input.id.as_ref()],
        bump,
        payer = authority,
        space = PET_CHECKIN_SPACE,
    )]
    pub pet_checkin: Account<'info, PetCheckin>,

    /// The existing medical record for the pet.
    /// Verified by seeds [b"medical-record", medical_record.id].
    #[account(
        seeds = [b"medical-record", medical_record.id.as_ref()],
        bump = medical_record.bump,
    )]
    pub medical_record: Account<'info, MedicalRecord>,

    /// The transaction signer and rent payer.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The Solana system program.
    pub system_program: Program<'info, System>,
}

// ---------------------------------------------------------------------------
// Instruction handlers
// ---------------------------------------------------------------------------

#[program]
pub mod vet_57b {
    use super::*;

    /// Register a new pet, creating an on-chain MedicalRecord PDA.
    pub fn register_pet(
        ctx: Context<RegisterPetAccounts>,
        input: RegisterPetInput,
    ) -> Result<()> {
        let medical_record = &mut ctx.accounts.medical_record;
        medical_record.id = input.id;
        medical_record.name = input.name.clone();
        medical_record.age = input.age;
        medical_record.animal_type = input.animal_type.clone();
        medical_record.caretaker_name = input.caretaker_name.clone();
        medical_record.caretaker_phone = input.caretaker_phone.clone();
        medical_record.bump = ctx.bumps.medical_record;

        emit!(MedicalRecordCreated {
            id: input.id,
            name: input.name,
            age: input.age,
            animal_type: input.animal_type,
            caretaker_name: input.caretaker_name,
            caretaker_phone: input.caretaker_phone,
        });

        Ok(())
    }

    /// Schedule a medical appointment for a registered pet.
    pub fn schedule_medical_appointment(
        ctx: Context<ScheduleMedicalAppointmentAccounts>,
        input: ScheduleAppointmentInput,
    ) -> Result<()> {
        let appointment = &mut ctx.accounts.medical_appointment;
        appointment.id = input.id;
        appointment.medical_record = ctx.accounts.medical_record.key();
        appointment.date = input.date;
        appointment.time = input.time.clone();
        appointment.appointment_value = input.appointment_value;
        appointment.paid_value = 0;
        appointment.bump = ctx.bumps.medical_appointment;

        emit!(MedicalAppointmentCreated {
            id: input.id,
            pet_id: ctx.accounts.medical_record.key(),
            date: input.date,
            time: input.time,
            appointment_value: input.appointment_value,
            paid_value: 0,
        });

        Ok(())
    }

    /// Pay for a medical appointment. Supports partial and full payment.
    /// Rejects overpayment via PaymentExceedsCost error.
    pub fn pay_medical_appointment(
        ctx: Context<PayMedicalAppointmentAccounts>,
        input: PayAppointmentInput,
    ) -> Result<()> {
        let appointment = &mut ctx.accounts.medical_appointment;

        let remaining_cost = appointment
            .appointment_value
            .checked_sub(appointment.paid_value)
            .ok_or(Vet57bError::PaymentExceedsCost)?;

        require!(
            input.amount <= remaining_cost,
            Vet57bError::PaymentExceedsCost
        );

        appointment.paid_value = appointment
            .paid_value
            .checked_add(input.amount)
            .ok_or(Vet57bError::PaymentExceedsCost)?;

        Ok(())
    }

    /// Record a pet's arrival at the clinic with an on-chain timestamp.
    pub fn take_pet_to_vet(
        ctx: Context<TakePetToVetAccounts>,
        input: TakePetToVetInput,
    ) -> Result<()> {
        let checkin = &mut ctx.accounts.pet_checkin;
        checkin.id = input.id;
        checkin.medical_record = ctx.accounts.medical_record.key();
        checkin.checkin_time = Clock::get()?.unix_timestamp;
        checkin.bump = ctx.bumps.pet_checkin;

        Ok(())
    }
}
