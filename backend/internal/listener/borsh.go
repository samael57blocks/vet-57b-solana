// Package listener provides the Solana event indexer: a WebSocket subscription
// for Anchor events and a periodic account poller. Both write to PostgreSQL via
// the EventStore interface.
package listener

import (
	"encoding/binary"
	"fmt"
)

// borshDecoder reads borsh-encoded data produced by Anchor's
// AnchorSerialize/AnchorDeserialize trait. All multi-byte integers are
// little-endian.
//
// Borsh field encoding:
//   - u8 / i8       → 1 byte
//   - u16 / i16     → 2 bytes LE
//   - u32 / i32     → 4 bytes LE
//   - u64 / i64     → 8 bytes LE
//   - [32]byte      → 32 bytes (fixed array, no length prefix)
//   - string        → 4-byte LE length prefix + UTF-8 bytes
//   - enum (no data) → 1 byte variant index
type borshDecoder struct {
	data []byte
	pos  int
}

func newBorshDecoder(data []byte) *borshDecoder {
	return &borshDecoder{data: data}
}

func (d *borshDecoder) remaining() int {
	return len(d.data) - d.pos
}

func (d *borshDecoder) read(count int) ([]byte, error) {
	if d.pos+count > len(d.data) {
		return nil, fmt.Errorf("borsh: need %d bytes at offset %d, have %d", count, d.pos, len(d.data)-d.pos)
	}
	chunk := d.data[d.pos : d.pos+count]
	d.pos += count
	return chunk, nil
}

// readU8 reads a single uint8.
func (d *borshDecoder) readU8() (uint8, error) {
	b, err := d.read(1)
	if err != nil {
		return 0, err
	}
	return b[0], nil
}

// readU32 reads a uint32 in little-endian.
func (d *borshDecoder) readU32() (uint32, error) {
	b, err := d.read(4)
	if err != nil {
		return 0, err
	}
	return binary.LittleEndian.Uint32(b), nil
}

// readU64 reads a uint64 in little-endian.
func (d *borshDecoder) readU64() (uint64, error) {
	b, err := d.read(8)
	if err != nil {
		return 0, err
	}
	return binary.LittleEndian.Uint64(b), nil
}

// readI64 reads an int64 in little-endian.
func (d *borshDecoder) readI64() (int64, error) {
	b, err := d.read(8)
	if err != nil {
		return 0, err
	}
	return int64(binary.LittleEndian.Uint64(b)), nil
}

// readFixed32 reads a 32-byte fixed-size array (e.g., a Solana Pubkey).
func (d *borshDecoder) readFixed32() ([32]byte, error) {
	b, err := d.read(32)
	if err != nil {
		return [32]byte{}, err
	}
	var arr [32]byte
	copy(arr[:], b)
	return arr, nil
}

// readString reads a borsh-length-prefixed string (4-byte LE length + UTF-8).
func (d *borshDecoder) readString() (string, error) {
	length, err := d.readU32()
	if err != nil {
		return "", err
	}
	b, err := d.read(int(length))
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// readDiscriminator reads 8 bytes and returns them as a fixed-size array.
// This is the Anchor event or account discriminator.
func (d *borshDecoder) readDiscriminator() ([8]byte, error) {
	b, err := d.read(8)
	if err != nil {
		return [8]byte{}, err
	}
	var disc [8]byte
	copy(disc[:], b)
	return disc, nil
}

// borshEncodeString returns the borsh encoding of a string: 4-byte LE length
// prefix followed by the UTF-8 bytes.
func borshEncodeString(s string) []byte {
	n := len(s)
	buf := make([]byte, 4+n)
	binary.LittleEndian.PutUint32(buf[:4], uint32(n))
	copy(buf[4:], s)
	return buf
}
