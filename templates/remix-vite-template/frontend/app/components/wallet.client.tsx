import { ccc } from '@ckb-ccc/connector-react';
import React, { useEffect, useState } from 'react';
import { common } from '@ckb-lumos/common-scripts';
import { TransactionSkeleton } from '@ckb-lumos/helpers';
import offckb from 'offckb.config';
import { WalletClient } from './wallet-client.client';

const { indexer } = offckb;

function WalletIcon({ wallet, className }: { wallet: ccc.Wallet; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={wallet.icon} alt={wallet.name} className={`h-8 w-8 rounded-full ${className}`} />
  );
}

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`flex items-center rounded-full bg-orange-600 px-5 py-3 text-white ${props.className}`}
    />
  );
}

function Sign() {
  const signer = ccc.useSigner();
  const [messageToSign, setMessageToSign] = useState<string>('');
  const [signature, setSignature] = useState<string>('');

  return (
    <>
      {signature !== '' ? (
        <>
          <p className="mb-1">Signature</p>
          <p className="mb-1 w-full whitespace-normal text-balance break-all text-center">{signature}</p>
        </>
      ) : null}
      <div className="mb-1 flex items-center">
        <input
          className="rounded-full border border-black px-4 py-2"
          type="text"
          value={messageToSign}
          onInput={(e) => setMessageToSign(e.currentTarget.value)}
          placeholder="Enter message to sign"
        />
        <Button
          className="ml-2"
          onClick={async () => {
            if (!signer) {
              return;
            }
            setSignature(await signer.signMessage(messageToSign));
          }}
        >
          Sign
        </Button>
      </div>
    </>
  );
}

function Transfer() {
  const signer = ccc.useSigner();
  const [transferTo, setTransferTo] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [hash, setHash] = useState<string>('');
  const [data, setData] = useState<string>('');

  return (
    <>
      {hash !== '' ? <p className="mb-1 w-full whitespace-normal text-balance break-all text-center">{hash}</p> : <></>}
      <div className="mb-1 flex items-center">
        <div className="flex flex-col">
          <input
            className="rounded-full border border-black px-4 py-2"
            type="text"
            value={transferTo}
            onInput={(e) => setTransferTo(e.currentTarget.value)}
            placeholder="Enter address to transfer to"
          />
          <input
            className="mt-1 rounded-full border border-black px-4 py-2"
            type="text"
            value={amount}
            onInput={(e) => setAmount(e.currentTarget.value)}
            placeholder="Enter amount in CKB to transfer"
          />
          <textarea
            className="mt-1 rounded-3xl border border-black px-4 py-2"
            value={data}
            onInput={(e) => setData(e.currentTarget.value)}
            placeholder="Enter data in the cell. Hex string will be parsed."
          />
        </div>
        <Button
          className="ml-2"
          onClick={async () => {
            if (!signer) {
              return;
            }
            // Verify address
            await ccc.Address.fromString(transferTo, signer.client);

            // === Composing transaction with Lumos ===
            let txSkeleton = new TransactionSkeleton({
              cellProvider: indexer,
            });
            txSkeleton = await common.transfer(
              txSkeleton,
              [await signer.getRecommendedAddress()],
              transferTo,
              ccc.fixedPointFrom(amount),
              undefined,
              undefined,
            );
            txSkeleton = await common.payFeeByFeeRate(
              txSkeleton,
              [await signer.getRecommendedAddress()],
              BigInt(1500),
              undefined,
            );
            // ======

            const tx = ccc.Transaction.fromLumosSkeleton(txSkeleton);

            // CCC transactions are easy to be edited
            const dataBytes = (() => {
              try {
                return ccc.bytesFrom(data);
              } catch (e) {}

              return ccc.bytesFrom(data, 'utf8');
            })();
            if (tx.outputs[0].capacity < ccc.fixedPointFrom(dataBytes.length)) {
              throw new Error('Insufficient capacity to store data');
            }
            tx.outputsData[0] = ccc.hexFrom(dataBytes);

            // Sign and send the transaction
            setHash(await signer.sendTransaction(tx));
          }}
        >
          Transfer
        </Button>
      </div>
    </>
  );
}

export function Wallet() {
  const { wallet, open, disconnect, setClient, status } = ccc.useCcc();
  const signer = ccc.useSigner();

  const [internalAddress, setInternalAddress] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!signer) {
      setInternalAddress('');
      setAddress('');
      return;
    }

    (async () => {
      setInternalAddress(await signer.getInternalAddress());
      setAddress(await signer.getRecommendedAddress());
    })();
  }, [signer]);

  useEffect(() => {
    setClient(new WalletClient());
  }, [offckb.currentNetwork, setClient]);

  return (
    <div>
      {wallet ? (
        <>
          <WalletIcon wallet={wallet} className="mb-1" />
          <p className="mb-1">Connected to {wallet.name}</p>
          <p className="mb-1">{internalAddress}</p>
          <p className="mb-1 text-balance">{address}</p>
          <Sign />
          <Transfer />
          <Button className="mt-4" onClick={disconnect}>
            Disconnect
          </Button>
        </>
      ) : (
        <Button onClick={open}>Connect Wallet</Button>
      )}
    </div>
  );
}
